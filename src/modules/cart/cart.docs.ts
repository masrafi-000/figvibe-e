import {
  extendZodWithOpenApi,
  type OpenAPIRegistry,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { ZCIAddToCart, ZCIUpdateCartItem } from './cart.schema';

extendZodWithOpenApi(z);

export const registerCartDocs = (registry: OpenAPIRegistry): void => {
  // Nested Variant Relationships
  const ZCICartProduct = registry.register(
    'CartProduct',
    z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      images: z.array(z.any()).optional(),
    }),
  );

  const ZCICartSize = registry.register(
    'CartSize',
    z
      .object({
        id: z.string(),
        name: z.string(),
        code: z.string(),
      })
      .nullable(),
  );

  const ZCICartColor = registry.register(
    'CartColor',
    z
      .object({
        id: z.string(),
        name: z.string(),
        hex: z.string().nullable(),
      })
      .nullable(),
  );

  const ZCICartImage = registry.register(
    'CartImage',
    z.object({
      id: z.string(),
      url: z.string(),
      altText: z.string().nullable().optional(),
      sortOrder: z.number().optional(),
      isPrimary: z.boolean().optional(),
    }),
  );

  const ZCICartVariant = registry.register(
    'CartVariant',
    z.object({
      id: z.string(),
      sku: z.string(),
      price: z.number().describe('Current variant unit price'),
      comparePrice: z
        .number()
        .nullable()
        .optional()
        .describe('Original or compare price before discount'),
      isActive: z.boolean(),
      product: ZCICartProduct,
      size: ZCICartSize,
      color: ZCICartColor,
      images: z.array(ZCICartImage).optional(),
    }),
  );

  // Cart Line Item
  const ZCICartItemResponse = registry.register(
    'CartItemResponse',
    z.object({
      id: z.string().describe('Cart item ID'),
      quantity: z
        .number()
        .int()
        .min(1)
        .describe('Quantity of the variant in the cart'),
      unitPrice: z.number().describe('Unit price at the time of query'),
      subtotal: z.number().describe('Line total = unitPrice * quantity'),
      availableStock: z
        .number()
        .int()
        .describe('Currently available inventory stock'),
      isAvailable: z
        .boolean()
        .describe('Whether the variant is active and has sufficient stock'),
      createdAt: z.string().or(z.date()).describe('Time item was added'),
      updatedAt: z.string().or(z.date()).describe('Time item was last updated'),
      variant: ZCICartVariant,
    }),
  );

  // Full Cart Object
  const ZCICartResponse = registry.register(
    'CartResponse',
    z.object({
      id: z.string().nullable().describe('Unique cart ID, or null if empty'),
      userId: z.string().describe('User ID owning the cart'),
      itemCount: z
        .number()
        .int()
        .describe('Number of distinct line items in cart'),
      totalQuantity: z
        .number()
        .int()
        .describe('Total units count of all items combined'),
      subtotal: z
        .number()
        .describe('Sum of line totals for all available items'),
      items: z.array(ZCICartItemResponse).describe('List of items in the cart'),
      createdAt: z.string().or(z.date()).nullable().optional(),
      updatedAt: z.string().or(z.date()).nullable().optional(),
    }),
  );

  // Standard API Envelope for Get Cart
  const ZCIGetCartDataResponse = registry.register(
    'GetCartDataResponse',
    z.object({
      success: z.boolean(),
      data: z.object({
        cart: ZCICartResponse,
      }),
    }),
  );

  // Standard API Envelope for Mutating Cart Actions
  const ZCICartActionResponse = registry.register(
    'CartActionResponse',
    z.object({
      success: z.boolean(),
      message: z.string(),
      data: z.object({
        cart: ZCICartResponse,
      }),
    }),
  );

  // Error Response
  const ZCIErrorResponse = registry.register(
    'CartErrorResponse',
    z.object({
      success: z.boolean().default(false),
      message: z.string(),
      errors: z.array(z.any()).optional(),
    }),
  );

  // ==========================================
  // CART ROUTE DEFINITIONS
  // ==========================================

  // 1. Get User's Cart
  registry.registerPath({
    method: 'get',
    path: '/api/v1/cart',
    tags: ['Cart'],
    summary: "Get current authenticated user's cart",
    description:
      'Fetches the active cart for the authenticated user, including detailed variant attributes, pricing, and live inventory availability.',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'User cart fetched successfully',
        content: {
          'application/json': {
            schema: ZCIGetCartDataResponse,
          },
        },
      },
      401: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: ZCIErrorResponse,
          },
        },
      },
    },
  });

  // 2. Add Item to Cart
  registry.registerPath({
    method: 'post',
    path: '/api/v1/cart/items',
    tags: ['Cart'],
    summary: 'Add an item to the cart',
    description:
      'Adds a product variant to the cart or increments its quantity if already present. Enforces stock validation, maximum distinct items limit, and per-item quantity cap.',
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: ZCIAddToCart,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Item added to cart successfully',
        content: {
          'application/json': {
            schema: ZCICartActionResponse,
          },
        },
      },
      400: {
        description:
          'Validation error, insufficient inventory, or cart limit exceeded',
        content: {
          'application/json': {
            schema: ZCIErrorResponse,
          },
        },
      },
      401: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: ZCIErrorResponse,
          },
        },
      },
      404: {
        description: 'Product variant not found or inactive',
        content: {
          'application/json': {
            schema: ZCIErrorResponse,
          },
        },
      },
    },
  });

  // 3. Update Cart Item Quantity
  registry.registerPath({
    method: 'patch',
    path: '/api/v1/cart/items/{itemId}',
    tags: ['Cart'],
    summary: 'Update cart item quantity',
    description:
      'Updates the quantity of a specific cart item by itemId or variantId. Validates against available stock and max quantity limits.',
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        itemId: z.string().describe('Cart item ID or Product Variant ID'),
      }),
      body: {
        content: {
          'application/json': {
            schema: ZCIUpdateCartItem,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Cart item updated successfully',
        content: {
          'application/json': {
            schema: ZCICartActionResponse,
          },
        },
      },
      400: {
        description: 'Invalid quantity or insufficient stock',
        content: {
          'application/json': {
            schema: ZCIErrorResponse,
          },
        },
      },
      401: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: ZCIErrorResponse,
          },
        },
      },
      404: {
        description: 'Cart item not found',
        content: {
          'application/json': {
            schema: ZCIErrorResponse,
          },
        },
      },
    },
  });

  // 4. Remove Item from Cart
  registry.registerPath({
    method: 'delete',
    path: '/api/v1/cart/items/{itemId}',
    tags: ['Cart'],
    summary: 'Remove an item from the cart',
    description:
      'Deletes a specific line item from the user cart by itemId or variantId.',
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        itemId: z.string().describe('Cart item ID or Product Variant ID'),
      }),
    },
    responses: {
      200: {
        description: 'Item removed from cart successfully',
        content: {
          'application/json': {
            schema: ZCICartActionResponse,
          },
        },
      },
      401: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: ZCIErrorResponse,
          },
        },
      },
      404: {
        description: 'Cart item not found',
        content: {
          'application/json': {
            schema: ZCIErrorResponse,
          },
        },
      },
    },
  });

  // 5. Clear Entire Cart
  registry.registerPath({
    method: 'delete',
    path: '/api/v1/cart',
    tags: ['Cart'],
    summary: 'Clear all items from the cart',
    description:
      'Deletes all line items from the authenticated user cart in a single atomic transaction.',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Cart cleared successfully',
        content: {
          'application/json': {
            schema: ZCICartActionResponse,
          },
        },
      },
      401: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: ZCIErrorResponse,
          },
        },
      },
    },
  });
};
