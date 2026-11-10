import { randomUUID } from 'node:crypto';
import { AppError } from '../../common/utils/AppError';
import type { Database } from '../../db/prisma';
import { Prisma } from '../../generated/prisma/client';
import {
  MAX_DISTINCT_ITEMS,
  MAX_QTY_PER_ITEM,
  type ZCTAddToCart,
} from './cart.schema';

const cartInclude = {
  items: {
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      variant: {
        include: {
          product: {
            select: { id: true, name: true, slug: true, images: true },
          },
          size: { select: { id: true, name: true, code: true } },
          color: { select: { id: true, name: true, hex: true } },
          inventory: { select: { quantity: true, reserved: true } },
          images: true,
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

type CartWithItems = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

export class CartService {
  constructor(private readonly database: Database) {}

  private get prisma() {
    return this.database.client;
  }

  /**
   * Fetch active cart for a user with all nested variant details and stock status
   */
  async getCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: cartInclude,
    });

    return cart ? this.formatCart(cart) : this.emptyCart(userId);
  }

  /**
   * Add item to cart with concurrency protection and inventory validation
   */
  async addToCart(userId: string, data: ZCTAddToCart) {
    const variant = await this.prisma.productVariant.findUnique({
      where: {
        id: data.variantId,
      },
      select: {
        isActive: true,
        inventory: { select: { quantity: true, reserved: true } },
      },
    });

    if (!variant || !variant.isActive) {
      throw new AppError('Product variant not found or inactive', 404);
    }

    const available = Math.max(
      0,
      (variant.inventory?.quantity ?? 0) - (variant.inventory?.reserved ?? 0),
    );

    if (available < data.quantity) {
      throw new AppError(
        `Insufficient stock. Maximum available: ${available}`,
        400,
      );
    }

    const maxAllowed = Math.min(available, MAX_QTY_PER_ITEM);

    await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.upsert({
        where: { userId },
        create: { userId },
        update: { updatedAt: new Date() },
        select: { id: true },
      });

      const existing = await tx.cartItem.findUnique({
        where: {
          cartId_variantId: { cartId: cart.id, variantId: data.variantId },
        },
        select: { id: true },
      });

      if (!existing) {
        const count = await tx.cartItem.count({ where: { cartId: cart.id } });
        if (count >= MAX_DISTINCT_ITEMS) {
          throw new AppError(
            `Cart cannot hold more than ${MAX_DISTINCT_ITEMS} different items`,
            400,
          );
        }
      }

      const rows = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
        INSERT INTO "cart_items" ("id", "cartId", "variantId", "quantity", "createdAt", "updatedAt")
        VALUES (${randomUUID()}, ${cart.id}, ${data.variantId}, ${data.quantity}, now(), now())
        ON CONFLICT ("cartId", "variantId") DO UPDATE
          SET "quantity" = "cart_items"."quantity" + EXCLUDED."quantity",
              "updatedAt" = now()
          WHERE "cart_items"."quantity" + EXCLUDED."quantity" <= ${maxAllowed}
        RETURNING "id"
      `);

      if (rows.length === 0) {
        throw new AppError(
          `You cannot add more of this item. Limit is ${maxAllowed} per cart.`,
          400,
        );
      }
    });

    return this.getCart(userId);
  }

  /**
   * Update the quantity of an item in the cart
   */
  async updateCartItem(userId: string, itemId: string, quantity: number) {
    if (quantity <= 0) {
      return this.removeCartItem(userId, itemId);
    }

    if (quantity > MAX_QTY_PER_ITEM) {
      throw new AppError(
        `Quantity cannot exceed maximum of ${MAX_QTY_PER_ITEM} items`,
        400,
      );
    }

    const item = await this.prisma.cartItem.findFirst({
      where: {
        cart: { userId },
        OR: [{ id: itemId }, { variantId: itemId }],
      },
      include: {
        variant: {
          select: {
            id: true,
            isActive: true,
            inventory: { select: { quantity: true, reserved: true } },
          },
        },
      },
    });

    if (!item) {
      throw new AppError('Cart item not found', 404);
    }

    if (!item.variant.isActive) {
      throw new AppError('Product variant is currently inactive', 400);
    }

    const available = Math.max(
      0,
      (item.variant.inventory?.quantity ?? 0) -
        (item.variant.inventory?.reserved ?? 0),
    );

    if (available < quantity) {
      throw new AppError(
        `Insufficient stock. Maximum available: ${available}`,
        400,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.cartItem.update({
        where: { id: item.id },
        data: { quantity },
      });

      await tx.cart.update({
        where: { userId },
        data: { updatedAt: new Date() },
      });
    });

    return this.getCart(userId);
  }

  /**
   * Remove an item from the cart
   */
  async removeCartItem(userId: string, itemId: string) {
    const item = await this.prisma.cartItem.findFirst({
      where: {
        cart: { userId },
        OR: [{ id: itemId }, { variantId: itemId }],
      },
      select: { id: true, cartId: true },
    });

    if (!item) {
      throw new AppError('Cart item not found', 404);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.cartItem.delete({
        where: { id: item.id },
      });

      await tx.cart.update({
        where: { id: item.cartId },
        data: { updatedAt: new Date() },
      });
    });

    return this.getCart(userId);
  }

  /**
   * Clear all items from user's cart
   */
  async clearCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (cart) {
      await this.prisma.$transaction(async (tx) => {
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id },
        });

        await tx.cart.update({
          where: { id: cart.id },
          data: { updatedAt: new Date() },
        });
      });
    }

    return this.getCart(userId);
  }

  private emptyCart(userId: string) {
    return {
      id: null,
      userId,
      itemCount: 0,
      totalQuantity: 0,
      subtotal: 0,
      items: [],
      createdAt: null,
      updatedAt: null,
    };
  }

  private formatCart(cart: CartWithItems) {
    let totalQuantity = 0;
    let subtotal = new Prisma.Decimal(0);

    const items = cart.items.map((item) => {
      const { variant } = item;
      const available = Math.max(
        0,
        (variant.inventory?.quantity ?? 0) - (variant.inventory?.reserved ?? 0),
      );

      const isAvailable = variant.isActive && available >= item.quantity;
      const lineTotal = variant.price.mul(item.quantity);

      totalQuantity += item.quantity;
      if (isAvailable) {
        subtotal = subtotal.add(lineTotal);
      }

      return {
        id: item.id,
        quantity: item.quantity,
        unitPrice: variant.price.toNumber(),
        subtotal: lineTotal.toNumber(),
        availableStock: available,
        isAvailable,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        variant: {
          id: variant.id,
          sku: variant.sku,
          price: variant.price.toNumber(),
          comparePrice: variant.comparePrice?.toNumber() ?? null,
          isActive: variant.isActive,
          product: variant.product,
          size: variant.size,
          color: variant.color,
          images: variant.images,
        },
      };
    });

    return {
      id: cart.id,
      userId: cart.userId,
      itemCount: items.length,
      totalQuantity,
      subtotal: subtotal.toNumber(),
      items,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }
}
