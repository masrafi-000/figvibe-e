import { AppError } from '../../common/utils/AppError';
import type { Database } from '../../db/prisma';
import { Prisma } from '../../generated/prisma/client';
import type {
  ZCTCancelOrder,
  ZCTCreateAddress,
  ZCTCreateOrder,
  ZCTOrderQuery,
  ZCTUpdateOrderStatus,
} from './order.schema';

export const orderInclude = {
  items: {
    include: {
      variant: {
        select: {
          id: true,
          sku: true,
          price: true,
          images: {
            select: { id: true, url: true, altText: true, isPrimary: true },
          },
          size: { select: { id: true, name: true, code: true } },
          color: { select: { id: true, name: true, hex: true } },
        },
      },
    },
  },
  payment: true,
  shippingAddress: true,
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      username: true,
      phone: true,
      avatarUrl: true,
    },
  },
} satisfies Prisma.OrderInclude;

export type OrderWithDetails = Prisma.OrderGetPayload<{
  include: typeof orderInclude;
}>;

export class OrderService {
  constructor(private readonly database: Database) {}

  private get prisma() {
    return this.database.client;
  }

  /**
   * Generates a unique, readable order number: ORD-YYYYMMDD-XXXXX
   */
  private generateOrderNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();

    return `ORD-${year}${month}${day}-${randomHex}`;
  }

  /**
   * Create an order with transactional inventory validation and stock deduction
   */
  async createOrder(
    userId: string,
    data: ZCTCreateOrder,
  ): Promise<OrderWithDetails> {
    return await this.prisma.$transaction(
      async (tx) => {
        // 1. Resolve or Create Shipping Address
        let shippingAddressId = data.shippingAddressId;

        if (shippingAddressId) {
          const address = await tx.address.findFirst({
            where: { id: shippingAddressId, userId },
          });

          if (!address) {
            throw new AppError('Specified shipping address was not found', 404);
          }
        } else if (data.shippingAddress) {
          const newAddress = await tx.address.create({
            data: {
              ...data.shippingAddress,
              userId,
            },
          });
          shippingAddressId = newAddress.id;
        }

        if (!shippingAddressId) {
          throw new AppError('Valid shipping address is required', 400);
        }

        // 2. Gather Order Items
        interface ResolvedItem {
          variantId: string;
          quantity: number;
        }

        let resolvedItems: ResolvedItem[] = [];

        if (data.fromCart) {
          const cart = await tx.cart.findUnique({
            where: { userId },
            include: {
              items: {
                select: { variantId: true, quantity: true },
              },
            },
          });

          if (!cart || cart.items.length === 0) {
            throw new AppError('Your shopping cart is empty', 400);
          }

          resolvedItems = cart.items;
        } else if (data.items && data.items.length > 0) {
          resolvedItems = data.items;
        }

        if (resolvedItems.length === 0) {
          throw new AppError(
            'Order must contain at least one product item',
            400,
          );
        }

        // 3. Fetch and Validate Product Variants and Stock
        const variantIds = resolvedItems.map((i) => i.variantId);
        const variants = await tx.productVariant.findMany({
          where: { id: { in: variantIds } },
          include: {
            product: { select: { id: true, name: true, slug: true } },
            size: { select: { id: true, name: true, code: true } },
            color: { select: { id: true, name: true, hex: true } },
            inventory: true,
          },
        });

        const variantMap = new Map(variants.map((v) => [v.id, v]));

        let subtotal = new Prisma.Decimal(0);
        const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = [];

        for (const item of resolvedItems) {
          const variant = variantMap.get(item.variantId);

          if (!variant) {
            throw new AppError(
              `Variant ID ${item.variantId} was not found`,
              404,
            );
          }

          if (!variant.isActive) {
            throw new AppError(
              `Product '${variant.product.name}' is currently unavailable`,
              400,
            );
          }

          const availableStock = Math.max(
            0,
            (variant.inventory?.quantity ?? 0) -
              (variant.inventory?.reserved ?? 0),
          );

          if (availableStock < item.quantity) {
            throw new AppError(
              `Insufficient stock for '${variant.product.name}' (${variant.size?.name || ''} / ${variant.color?.name || ''}). Available: ${availableStock}`,
              400,
            );
          }

          const lineTotal = variant.price.mul(item.quantity);
          subtotal = subtotal.add(lineTotal);

          const variantName = [variant.size?.name, variant.color?.name]
            .filter(Boolean)
            .join(' / ');

          orderItemsData.push({
            variantId: variant.id,
            productName: variant.product.name,
            variantName: variantName || null,
            sku: variant.sku,
            quantity: item.quantity,
            unitPrice: variant.price,
            totalPrice: lineTotal,
          });
        }

        // 4. Handle Discounts and Coupons
        let discountAmount = new Prisma.Decimal(0);

        if (data.couponCode) {
          const discount = await tx.discount.findUnique({
            where: { code: data.couponCode },
          });

          if (!discount || discount.status !== 'ACTIVE') {
            throw new AppError('Invalid or inactive coupon code', 400);
          }

          const now = new Date();
          if (
            now < discount.startAt ||
            (discount.expiresAt && now > discount.expiresAt)
          ) {
            throw new AppError('Coupon has expired or is not active yet', 400);
          }

          if (
            discount.usageLimit !== null &&
            discount.usageCount >= discount.usageLimit
          ) {
            throw new AppError('Coupon usage limit has been reached', 400);
          }

          if (
            discount.minOrderAmount &&
            subtotal.lessThan(discount.minOrderAmount)
          ) {
            throw new AppError(
              `Minimum order amount for coupon '${data.couponCode}' is ${discount.minOrderAmount.toNumber()} BDT`,
              400,
            );
          }

          if (discount.type === 'PERCENTAGE') {
            let calculated = subtotal.mul(discount.value).div(100);
            if (
              discount.maxDiscount &&
              calculated.greaterThan(discount.maxDiscount)
            ) {
              calculated = discount.maxDiscount;
            }
            discountAmount = calculated;
          } else {
            discountAmount = Prisma.Decimal.min(subtotal, discount.value);
          }

          // Increment coupon usage count
          await tx.discount.update({
            where: { id: discount.id },
            data: { usageCount: { increment: 1 } },
          });
        }

        // 5. Calculate Delivery Fee, Tax, and Grand Total
        // Standard delivery fee: 60 BDT; Free delivery if subtotal >= 2500 BDT
        const deliveryFee = subtotal.greaterThanOrEqualTo(2500)
          ? new Prisma.Decimal(0)
          : new Prisma.Decimal(60);

        const tax = new Prisma.Decimal(0);
        const total = subtotal.sub(discountAmount).add(deliveryFee).add(tax);

        // 6. Generate Unique Order Number
        let orderNumber = this.generateOrderNumber();
        let attempts = 0;
        while (attempts < 5) {
          const exists = await tx.order.findUnique({
            where: { orderNumber },
            select: { id: true },
          });
          if (!exists) break;
          orderNumber = this.generateOrderNumber();
          attempts++;
        }

        // 7. Persist Order and Items
        const order = await tx.order.create({
          data: {
            orderNumber,
            userId,
            shippingAddressId,
            status: 'PENDING',
            subtotal,
            discount: discountAmount,
            deliveryFee,
            tax,
            total,
            couponCode: data.couponCode ?? null,
            notes: data.notes ?? null,
            items: {
              createMany: {
                data: orderItemsData,
              },
            },
            payment: {
              create: {
                method: data.paymentMethod,
                status: 'PENDING',
                amount: total,
              },
            },
          },
          include: orderInclude,
        });

        // 8. Deduct Stock & Record Inventory Transactions
        for (const item of resolvedItems) {
          const variant = variantMap.get(item.variantId);
          if (variant?.inventory) {
            await tx.inventory.update({
              where: { id: variant.inventory.id },
              data: {
                quantity: { decrement: item.quantity },
              },
            });

            await tx.inventoryTransaction.create({
              data: {
                inventoryId: variant.inventory.id,
                type: 'SALE',
                quantity: -item.quantity,
                referenceId: order.id,
                referenceType: 'Order',
                note: `Order ${order.orderNumber} placed by user`,
              },
            });
          }
        }

        // 9. Clear Ordered Items from Cart
        if (data.fromCart) {
          await tx.cartItem.deleteMany({
            where: { cart: { userId } },
          });
        } else {
          await tx.cartItem.deleteMany({
            where: {
              cart: { userId },
              variantId: { in: variantIds },
            },
          });
        }

        return order;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 15000,
      },
    );
  }

  /**
   * Fetch customer's orders with pagination and filtering
   */
  async getUserOrders(userId: string, query: ZCTOrderQuery) {
    const { page = 1, limit = 20, status, search, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      userId,
      ...(status ? { status } : {}),
      ...(search
        ? {
            orderNumber: { contains: search, mode: 'insensitive' },
          }
        : {}),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {}),
    };

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: orderInclude,
      }),
    ]);

    return {
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      data: orders,
    };
  }

  /**
   * Fetch all orders across system (for Admin / Staff)
   */
  async getAllOrders(query: ZCTOrderQuery) {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      userId,
      startDate,
      endDate,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      ...(userId ? { userId } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { orderNumber: { contains: search, mode: 'insensitive' } },
              { user: { email: { contains: search, mode: 'insensitive' } } },
              { user: { phone: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {}),
    };

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: orderInclude,
      }),
    ]);

    return {
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      data: orders,
    };
  }

  /**
   * Fetch a single order by ID or orderNumber with permission validation
   */
  async getOrderById(
    orderIdentifier: string,
    userId?: string,
    isAdminOrStaff = false,
  ): Promise<OrderWithDetails> {
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ id: orderIdentifier }, { orderNumber: orderIdentifier }],
      },
      include: orderInclude,
    });

    if (!order) {
      throw new AppError('Order was not found', 404);
    }

    if (!isAdminOrStaff && userId && order.userId !== userId) {
      throw new AppError('Forbidden: You can only view your own orders', 403);
    }

    return order;
  }

  /**
   * Update order status with inventory reconciliation on cancellation
   */
  async updateOrderStatus(
    orderId: string,
    data: ZCTUpdateOrderStatus,
    actorId?: string,
  ): Promise<OrderWithDetails> {
    return await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          payment: true,
        },
      });

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      const terminalStatuses = ['CANCELLED', 'RETURNED', 'REFUNDED'];
      if (
        terminalStatuses.includes(order.status) &&
        order.status !== data.status
      ) {
        throw new AppError(
          `Cannot change status of an order that is already ${order.status}`,
          400,
        );
      }

      // If status transitions to CANCELLED or RETURNED, restock inventory
      if (
        (data.status === 'CANCELLED' || data.status === 'RETURNED') &&
        !terminalStatuses.includes(order.status)
      ) {
        for (const item of order.items) {
          const inventory = await tx.inventory.findUnique({
            where: { variantId: item.variantId },
          });

          if (inventory) {
            await tx.inventory.update({
              where: { id: inventory.id },
              data: { quantity: { increment: item.quantity } },
            });

            await tx.inventoryTransaction.create({
              data: {
                inventoryId: inventory.id,
                type: data.status === 'CANCELLED' ? 'RELEASED' : 'RETURN',
                quantity: item.quantity,
                referenceId: order.id,
                referenceType: 'Order',
                note: `Order ${order.orderNumber} ${data.status.toLowerCase()} by staff ${actorId ?? ''}`,
              },
            });
          }
        }

        // Cancel / Refund payment if attached
        if (order.payment) {
          const newPaymentStatus =
            order.payment.status === 'PAID' ? 'REFUNDED' : 'CANCELLED';

          await tx.payment.update({
            where: { id: order.payment.id },
            data: { status: newPaymentStatus },
          });
        }
      }

      // If status transitions to DELIVERED and payment method was COD, mark payment as PAID
      if (
        data.status === 'DELIVERED' &&
        order.payment &&
        order.payment.method === 'COD' &&
        order.payment.status !== 'PAID'
      ) {
        await tx.payment.update({
          where: { id: order.payment.id },
          data: {
            status: 'PAID',
            paidAt: new Date(),
          },
        });
      }

      return await tx.order.update({
        where: { id: orderId },
        data: {
          status: data.status,
          notes: data.notes
            ? `${order.notes ?? ''}\n${data.notes}`.trim()
            : order.notes,
        },
        include: orderInclude,
      });
    });
  }

  /**
   * Cancel order (allowed for customer when PENDING, or admin anytime before DELIVERED)
   */
  async cancelOrder(
    orderId: string,
    userId: string,
    isAdmin = false,
    reason: string,
  ): Promise<OrderWithDetails> {
    return await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          payment: true,
        },
      });

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      if (!isAdmin && order.userId !== userId) {
        throw new AppError(
          'Forbidden: You can only cancel your own orders',
          403,
        );
      }

      if (order.status === 'CANCELLED') {
        throw new AppError('Order is already cancelled', 400);
      }

      if (order.status === 'DELIVERED') {
        throw new AppError(
          'Delivered orders cannot be cancelled. Please request a return.',
          400,
        );
      }

      if (!isAdmin && order.status !== 'PENDING') {
        throw new AppError(
          `Cannot cancel order in '${order.status}' status. Please contact customer support.`,
          400,
        );
      }

      // Restore inventory
      for (const item of order.items) {
        const inventory = await tx.inventory.findUnique({
          where: { variantId: item.variantId },
        });

        if (inventory) {
          await tx.inventory.update({
            where: { id: inventory.id },
            data: { quantity: { increment: item.quantity } },
          });

          await tx.inventoryTransaction.create({
            data: {
              inventoryId: inventory.id,
              type: 'RELEASED',
              quantity: item.quantity,
              referenceId: order.id,
              referenceType: 'Order',
              note: `Order ${order.orderNumber} cancelled by ${isAdmin ? 'admin' : 'customer'}. Reason: ${reason}`,
            },
          });
        }
      }

      // Update payment
      if (order.payment) {
        const newPaymentStatus =
          order.payment.status === 'PAID' ? 'REFUNDED' : 'CANCELLED';

        await tx.payment.update({
          where: { id: order.payment.id },
          data: { status: newPaymentStatus },
        });
      }

      const cancellationNote = `[Cancelled by ${isAdmin ? 'Admin' : 'Customer'}]: ${reason}`;

      return await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          notes: order.notes
            ? `${order.notes}\n${cancellationNote}`
            : cancellationNote,
        },
        include: orderInclude,
      });
    });
  }

  /**
   * Fetch saved addresses for the authenticated user
   */
  async getUserAddresses(userId: string) {
    return await this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Save a new address for the authenticated user
   */
  async createAddress(userId: string, data: ZCTCreateAddress) {
    if (data.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return await this.prisma.address.create({
      data: {
        ...data,
        userId,
      },
    });
  }
}
