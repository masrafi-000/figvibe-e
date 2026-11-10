import { emailQueue } from '../../common/queue/email.queue';
import { AppError } from '../../common/utils/AppError';
import type { Database } from '../../db/prisma';
import { Prisma } from '../../generated/prisma/client';
import { orderInclude, type OrderWithDetails } from '../order/order.service';
import type {
  ZCTPosCreateOrder,
  ZCTPosDeliveryUpdate,
  ZCTPosPerformanceQuery,
  ZCTPosSalesQuery,
} from './pos.schema';

export class PosService {
  constructor(private readonly database: Database) {}

  private get prisma() {
    return this.database.client;
  }

  /**
   * Generates unique POS Order Number: POS-YYYYMMDD-XXXXX
   */
  private generatePosOrderNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();

    return `POS-${year}${month}${day}-${randomHex}`;
  }

  /**
   * Generates a clean HTML receipt/invoice for customer email
   */
  private generateInvoiceHtml(order: OrderWithDetails): string {
    const itemsHtml = order.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">
            <strong>${item.productName}</strong>
            ${item.variantName ? `<br><small style="color: #64748b;">${item.variantName}</small>` : ''}
            <br><small style="color: #94a3b8;">SKU: ${item.sku}</small>
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${item.unitPrice.toString()} BDT</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${item.totalPrice.toString()} BDT</td>
        </tr>`,
      )
      .join('');

    return `
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px;">
        <h1 style="margin: 0; color: #0f172a; letter-spacing: 1px;">FIGVIBE STORE</h1>
        <p style="margin: 4px 0 0; color: #64748b; font-size: 14px;">Physical Retail Outlet & POS</p>
      </div>

      <div style="display: flex; justify-content: space-between; margin-top: 20px; font-size: 14px;">
        <div>
          <p style="margin: 2px 0;"><strong>Invoice No:</strong> ${order.orderNumber}</p>
          <p style="margin: 2px 0;"><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()} ${new Date(order.createdAt).toLocaleTimeString()}</p>
          <p style="margin: 2px 0;"><strong>Salesman:</strong> ${order.salesman?.firstName || ''} ${order.salesman?.lastName || ''} (${order.salesman?.username || 'Staff'})</p>
        </div>
        <div>
          <p style="margin: 2px 0;"><strong>Customer:</strong> ${order.customerName || 'Walk-in Customer'}</p>
          ${order.customerPhone ? `<p style="margin: 2px 0;"><strong>Phone:</strong> ${order.customerPhone}</p>` : ''}
          ${order.customerEmail ? `<p style="margin: 2px 0;"><strong>Email:</strong> ${order.customerEmail}</p>` : ''}
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 25px; font-size: 14px;">
        <thead>
          <tr style="background-color: #f8fafc;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #cbd5e1;">Item Description</th>
            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #cbd5e1;">Qty</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #cbd5e1;">Unit Price</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #cbd5e1;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div style="margin-top: 20px; float: right; width: 260px; font-size: 14px;">
        <div style="display: flex; justify-content: space-between; padding: 4px 0;">
          <span>Subtotal:</span>
          <span>${order.subtotal.toString()} BDT</span>
        </div>
        ${
          order.discount.greaterThan(0)
            ? `<div style="display: flex; justify-content: space-between; padding: 4px 0; color: #dc2626;">
                <span>Discount:</span>
                <span>-${order.discount.toString()} BDT</span>
              </div>`
            : ''
        }
        <div style="display: flex; justify-content: space-between; padding: 4px 0;">
          <span>Delivery Fee:</span>
          <span>${order.deliveryFee.toString()} BDT</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 16px; font-weight: bold; border-top: 2px solid #0f172a; margin-top: 5px;">
          <span>Grand Total:</span>
          <span>${order.total.toString()} BDT</span>
        </div>
      </div>

      <div style="clear: both;"></div>

      <div style="margin-top: 30px; padding: 15px; background-color: #f1f5f9; border-radius: 6px; font-size: 13px;">
        <p style="margin: 2px 0;"><strong>Payment Method:</strong> ${order.payment?.method || 'CASH'}</p>
        <p style="margin: 2px 0;"><strong>Payment Status:</strong> ${order.payment?.status || 'PAID'}</p>
        ${order.payment?.transactionId ? `<p style="margin: 2px 0;"><strong>Transaction ID:</strong> ${order.payment.transactionId}</p>` : ''}
        <p style="margin: 2px 0;"><strong>Delivery:</strong> ${order.deliveryType === 'STORE_PICKUP' ? 'Store Handover (Pickup)' : 'Store Dispatch (Home Delivery)'}</p>
      </div>

      <div style="text-align: center; margin-top: 30px; color: #94a3b8; font-size: 12px;">
        <p>Thank you for shopping at Figvibe! Please keep this invoice for your warranty and exchange records.</p>
      </div>
    </div>`;
  }

  /**
   * Create an in-store order created by a salesman (POS Checkout)
   */
  async createPosOrder(
    salesmanId: string,
    data: ZCTPosCreateOrder,
  ): Promise<OrderWithDetails> {
    const createdOrder = await this.prisma.$transaction(
      async (tx) => {
        // 1. Resolve or Create Customer User Profile
        let customerUserId = salesmanId;

        if (data.customerPhone || data.customerEmail) {
          const customer = await tx.user.findFirst({
            where: {
              OR: [
                ...(data.customerPhone ? [{ phone: data.customerPhone }] : []),
                ...(data.customerEmail ? [{ email: data.customerEmail }] : []),
              ],
            },
          });

          if (customer) {
            customerUserId = customer.id;
          } else if (data.customerPhone) {
            const customerRole = await tx.role.findUnique({
              where: { name: 'CUSTOMER' },
            });

            const newCustomer = await tx.user.create({
              data: {
                firstName: data.customerName,
                phone: data.customerPhone,
                email:
                  data.customerEmail && data.customerEmail !== ''
                    ? data.customerEmail
                    : `${data.customerPhone}@pos.customer.store`,
                roleId:
                  customerRole?.id ??
                  (
                    await tx.role.findFirstOrThrow({
                      where: { name: 'CUSTOMER' },
                    })
                  ).id,
                status: 'ACTIVE',
              },
            });
            customerUserId = newCustomer.id;
          }
        }

        // 2. Resolve Shipping Address if Home Delivery
        let shippingAddressId = data.shippingAddressId;

        if (data.deliveryType === 'HOME_DELIVERY') {
          if (shippingAddressId) {
            const addr = await tx.address.findUnique({
              where: { id: shippingAddressId },
            });
            if (!addr) {
              throw new AppError('Shipping address not found', 404);
            }
          } else if (data.shippingAddress) {
            const newAddr = await tx.address.create({
              data: {
                ...data.shippingAddress,
                userId: customerUserId,
              },
            });
            shippingAddressId = newAddr.id;
          }
        }

        // 3. Fetch and Validate Product Variants and Real-Time Stock
        const variantIds = data.items.map((i) => i.variantId);
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

        for (const item of data.items) {
          const variant = variantMap.get(item.variantId);

          if (!variant) {
            throw new AppError(
              `Variant ID ${item.variantId} was not found`,
              404,
            );
          }

          if (!variant.isActive) {
            throw new AppError(
              `Product '${variant.product.name}' is currently inactive`,
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
              `Insufficient stock for '${variant.product.name}' (${variant.size?.name || ''} / ${variant.color?.name || ''}). Available in store: ${availableStock}`,
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

        // 4. Discounts (Coupon or In-store manager discount)
        let discountAmount = new Prisma.Decimal(data.discountAmount || 0);

        if (data.couponCode) {
          const discount = await tx.discount.findUnique({
            where: { code: data.couponCode },
          });

          if (discount && discount.status === 'ACTIVE') {
            const now = new Date();
            if (
              now >= discount.startAt &&
              (!discount.expiresAt || now <= discount.expiresAt)
            ) {
              if (discount.type === 'PERCENTAGE') {
                let calculated = subtotal.mul(discount.value).div(100);
                if (
                  discount.maxDiscount &&
                  calculated.greaterThan(discount.maxDiscount)
                ) {
                  calculated = discount.maxDiscount;
                }
                discountAmount = Prisma.Decimal.max(discountAmount, calculated);
              } else {
                discountAmount = Prisma.Decimal.max(
                  discountAmount,
                  Prisma.Decimal.min(subtotal, discount.value),
                );
              }

              await tx.discount.update({
                where: { id: discount.id },
                data: { usageCount: { increment: 1 } },
              });
            }
          }
        }

        // 5. Delivery Fee & Total Calculation
        const deliveryFee =
          data.deliveryType === 'STORE_PICKUP'
            ? new Prisma.Decimal(0)
            : new Prisma.Decimal(60);

        const total = Prisma.Decimal.max(
          new Prisma.Decimal(0),
          subtotal.sub(discountAmount).add(deliveryFee),
        );

        // 6. Generate POS Order Number
        let orderNumber = this.generatePosOrderNumber();
        let attempts = 0;
        while (attempts < 5) {
          const exists = await tx.order.findUnique({
            where: { orderNumber },
            select: { id: true },
          });
          if (!exists) break;
          orderNumber = this.generatePosOrderNumber();
          attempts++;
        }

        // In-store store pickup orders are immediately DELIVERED
        const orderStatus =
          data.deliveryType === 'STORE_PICKUP' ? 'DELIVERED' : 'CONFIRMED';

        // Payment Metadata (Amount received and change given for CASH)
        let paymentMetadata: Prisma.InputJsonValue | undefined = undefined;
        if (data.paymentMethod === 'CASH' && data.amountReceived) {
          paymentMetadata = {
            amountReceived: data.amountReceived,
            changeGiven: Math.max(0, data.amountReceived - total.toNumber()),
          };
        }

        // 7. Persist Order Record
        const order = await tx.order.create({
          data: {
            orderNumber,
            userId: customerUserId,
            salesmanId,
            channel: 'POS',
            deliveryType: data.deliveryType,
            status: orderStatus,
            customerName: data.customerName,
            customerPhone: data.customerPhone ?? null,
            customerEmail:
              data.customerEmail && data.customerEmail !== ''
                ? data.customerEmail
                : null,
            subtotal,
            discount: discountAmount,
            deliveryFee,
            tax: new Prisma.Decimal(0),
            total,
            couponCode: data.couponCode ?? null,
            notes: data.notes ?? null,
            shippingAddressId,
            items: {
              createMany: {
                data: orderItemsData,
              },
            },
            payment: {
              create: {
                method: data.paymentMethod,
                status: 'PAID',
                amount: total,
                transactionId: data.transactionId ?? null,
                paidAt: new Date(),
                metadata: paymentMetadata,
              },
            },
          },
          include: orderInclude,
        });

        // 8. Deduct Store Inventory and Log Transactions
        for (const item of data.items) {
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
                referenceType: 'POS_Order',
                note: `In-Store POS Sale ${order.orderNumber} placed by salesman ${salesmanId}`,
              },
            });
          }
        }

        return order;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 15000,
      },
    );

    // 9. Asynchronously Queue Customer Invoice Email (Non-blocking)
    const emailRecipient =
      createdOrder.customerEmail ||
      (createdOrder.user?.email &&
      !createdOrder.user.email.endsWith('@pos.customer.store')
        ? createdOrder.user.email
        : null);

    if (emailRecipient) {
      void emailQueue
        .add('send-invoice', {
          to: emailRecipient,
          subject: `Your Receipt for Order ${createdOrder.orderNumber} - Figvibe Store`,
          html: this.generateInvoiceHtml(createdOrder),
        })
        .catch(() => {
          // Non-blocking background error
        });
    }

    return createdOrder;
  }

  /**
   * Process in-store order delivery / handover
   */
  async processDelivery(
    orderId: string,
    salesmanId: string,
    data: ZCTPosDeliveryUpdate,
  ): Promise<OrderWithDetails> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Mark delivery and ensure payment is settled
    return await this.prisma.$transaction(async (tx) => {
      if (data.status === 'DELIVERED' && order.payment?.status !== 'PAID') {
        await tx.payment.update({
          where: { orderId },
          data: { status: 'PAID', paidAt: new Date() },
        });
      }

      return await tx.order.update({
        where: { id: orderId },
        data: {
          status: data.status,
          notes: data.notes
            ? `${order.notes ?? ''}\n[Delivery update by ${salesmanId}]: ${data.notes}`.trim()
            : order.notes,
        },
        include: orderInclude,
      });
    });
  }

  /**
   * Send or resend an invoice email to customer
   */
  async sendInvoiceEmail(
    orderId: string,
    targetEmail?: string,
  ): Promise<{ success: boolean; recipient: string }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: orderInclude,
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    const recipient =
      targetEmail ||
      order.customerEmail ||
      (order.user?.email && !order.user.email.endsWith('@pos.customer.store')
        ? order.user.email
        : null);

    if (!recipient) {
      throw new AppError(
        'No customer email address on file. Please specify an email address.',
        400,
      );
    }

    await emailQueue.add('send-invoice', {
      to: recipient,
      subject: `Invoice for Order #${order.orderNumber} - Figvibe Store`,
      html: this.generateInvoiceHtml(order),
    });

    // If target email was provided, store it on the order
    if (targetEmail && order.customerEmail !== targetEmail) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { customerEmail: targetEmail },
      });
    }

    return { success: true, recipient };
  }

  /**
   * Get salesman's personal sales history
   */
  async getSalesmanSales(salesmanId: string, query: ZCTPosSalesQuery) {
    const {
      page = 1,
      limit = 20,
      status,
      paymentMethod,
      deliveryType,
      search,
      startDate,
      endDate,
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      channel: 'POS',
      salesmanId,
      ...(status ? { status } : {}),
      ...(deliveryType ? { deliveryType } : {}),
      ...(paymentMethod ? { payment: { method: paymentMethod } } : {}),
      ...(search
        ? {
            OR: [
              { orderNumber: { contains: search, mode: 'insensitive' } },
              { customerName: { contains: search, mode: 'insensitive' } },
              { customerPhone: { contains: search, mode: 'insensitive' } },
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
   * Salesman personal dashboard performance summary
   */
  async getSalesmanSummary(salesmanId: string) {
    const now = new Date();

    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const baseWhere: Prisma.OrderWhereInput = {
      channel: 'POS',
      salesmanId,
      status: { notIn: ['CANCELLED', 'REFUNDED'] },
    };

    const [todayStats, weekStats, monthStats, lifetimeStats] =
      await Promise.all([
        this.prisma.order.aggregate({
          where: { ...baseWhere, createdAt: { gte: todayStart } },
          _count: { id: true },
          _sum: { total: true },
        }),
        this.prisma.order.aggregate({
          where: { ...baseWhere, createdAt: { gte: weekStart } },
          _count: { id: true },
          _sum: { total: true },
        }),
        this.prisma.order.aggregate({
          where: { ...baseWhere, createdAt: { gte: monthStart } },
          _count: { id: true },
          _sum: { total: true },
        }),
        this.prisma.order.aggregate({
          where: baseWhere,
          _count: { id: true },
          _sum: { total: true },
        }),
      ]);

    // Top selling variants by this salesman
    const topVariants = await this.prisma.orderItem.groupBy({
      by: ['variantId', 'productName', 'variantName', 'sku'],
      where: {
        order: {
          channel: 'POS',
          salesmanId,
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
      },
      _sum: {
        quantity: true,
        totalPrice: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 5,
    });

    return {
      today: {
        ordersCount: todayStats._count.id,
        revenue: todayStats._sum.total?.toNumber() ?? 0,
      },
      thisWeek: {
        ordersCount: weekStats._count.id,
        revenue: weekStats._sum.total?.toNumber() ?? 0,
      },
      thisMonth: {
        ordersCount: monthStats._count.id,
        revenue: monthStats._sum.total?.toNumber() ?? 0,
      },
      lifetime: {
        ordersCount: lifetimeStats._count.id,
        revenue: lifetimeStats._sum.total?.toNumber() ?? 0,
        averageOrderValue:
          lifetimeStats._count.id > 0
            ? (lifetimeStats._sum.total?.toNumber() ?? 0) /
              lifetimeStats._count.id
            : 0,
      },
      topSellingItems: topVariants.map((item) => ({
        variantId: item.variantId,
        productName: item.productName,
        variantName: item.variantName,
        sku: item.sku,
        totalQuantitySold: item._sum.quantity ?? 0,
        totalRevenue: item._sum.totalPrice?.toNumber() ?? 0,
      })),
    };
  }

  /**
   * Admin / Super Admin: View all POS sales across all salesmen
   */
  async getAllPosSales(query: ZCTPosSalesQuery) {
    const {
      page = 1,
      limit = 20,
      salesmanId,
      status,
      paymentMethod,
      deliveryType,
      search,
      startDate,
      endDate,
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      channel: 'POS',
      ...(salesmanId ? { salesmanId } : {}),
      ...(status ? { status } : {}),
      ...(deliveryType ? { deliveryType } : {}),
      ...(paymentMethod ? { payment: { method: paymentMethod } } : {}),
      ...(search
        ? {
            OR: [
              { orderNumber: { contains: search, mode: 'insensitive' } },
              { customerName: { contains: search, mode: 'insensitive' } },
              { customerPhone: { contains: search, mode: 'insensitive' } },
              { customerEmail: { contains: search, mode: 'insensitive' } },
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
   * Admin / Super Admin: Salesmen Leaderboard and Performance Breakdown
   */
  async getSalesmenPerformance(query: ZCTPosPerformanceQuery) {
    const { salesmanId, startDate, endDate } = query;

    const where: Prisma.OrderWhereInput = {
      channel: 'POS',
      status: { notIn: ['CANCELLED', 'REFUNDED'] },
      salesmanId: salesmanId ? salesmanId : { not: null },
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {}),
    };

    const performance = await this.prisma.order.groupBy({
      by: ['salesmanId'],
      where,
      _count: { id: true },
      _sum: { total: true },
      orderBy: {
        _sum: { total: 'desc' },
      },
    });

    const salesmanIds = performance
      .map((p) => p.salesmanId)
      .filter((id): id is string => Boolean(id));

    const salesmen = await this.prisma.user.findMany({
      where: { id: { in: salesmanIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        phone: true,
        avatarUrl: true,
      },
    });

    const salesmanMap = new Map(salesmen.map((s) => [s.id, s]));

    return performance.map((p) => {
      const salesman = p.salesmanId ? salesmanMap.get(p.salesmanId) : null;
      const totalRevenue = p._sum.total?.toNumber() ?? 0;
      const totalOrders = p._count.id;
      const averageOrderValue =
        totalOrders > 0 ? totalRevenue / totalOrders : 0;

      return {
        salesmanId: p.salesmanId,
        salesman: salesman ?? null,
        totalOrders,
        totalRevenue,
        averageOrderValue,
      };
    });
  }

  /**
   * Admin / Super Admin: Product Variant Sales Report (Who sold which variants)
   */
  async getVariantSalesReport(query: ZCTPosPerformanceQuery) {
    const { salesmanId, startDate, endDate } = query;

    return await this.prisma.orderItem.groupBy({
      by: ['variantId', 'productName', 'variantName', 'sku'],
      where: {
        order: {
          channel: 'POS',
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
          ...(salesmanId ? { salesmanId } : {}),
          ...(startDate || endDate
            ? {
                createdAt: {
                  ...(startDate ? { gte: new Date(startDate) } : {}),
                  ...(endDate ? { lte: new Date(endDate) } : {}),
                },
              }
            : {}),
        },
      },
      _sum: {
        quantity: true,
        totalPrice: true,
      },
      orderBy: {
        _sum: {
          totalPrice: 'desc',
        },
      },
    });
  }
}
