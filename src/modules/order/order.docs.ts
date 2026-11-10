import {
  extendZodWithOpenApi,
  type OpenAPIRegistry,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  OrderStatusEnum,
  PaymentMethodEnum,
  PaymentStatusEnum,
  ZCICancelOrder,
  ZCICreateAddress,
  ZCICreateOrder,
  ZCIOrderQuery,
  ZCIUpdateOrderStatus,
} from './order.schema';

extendZodWithOpenApi(z);

export const registerOrderDocs = (registry: OpenAPIRegistry): void => {
  // Address Model
  const ZCIOrderAddressResponse = registry.register(
    'OrderAddressResponse',
    z.object({
      id: z.string(),
      type: z.string(),
      recipientName: z.string().nullable().optional(),
      recipientPhone: z.string().nullable().optional(),
      addressLine1: z.string(),
      addressLine2: z.string().nullable().optional(),
      city: z.string(),
      district: z.string(),
      postalCode: z.string(),
      country: z.string(),
      isDefault: z.boolean(),
      createdAt: z.string().or(z.date()).optional(),
    }),
  );

  // Payment Model
  const ZCIOrderPaymentResponse = registry.register(
    'OrderPaymentResponse',
    z.object({
      id: z.string(),
      method: PaymentMethodEnum,
      status: PaymentStatusEnum,
      amount: z.number().or(z.string()),
      transactionId: z.string().nullable().optional(),
      provider: z.string().nullable().optional(),
      paidAt: z.string().or(z.date()).nullable().optional(),
      createdAt: z.string().or(z.date()).optional(),
    }),
  );

  // Order Item
  const ZCIOrderItemResponse = registry.register(
    'OrderItemResponse',
    z.object({
      id: z.string(),
      variantId: z.string(),
      productName: z.string(),
      variantName: z.string().nullable().optional(),
      sku: z.string(),
      quantity: z.number().int(),
      unitPrice: z.number().or(z.string()),
      totalPrice: z.number().or(z.string()),
      variant: z
        .object({
          id: z.string(),
          sku: z.string(),
          price: z.number().or(z.string()),
          size: z
            .object({
              id: z.string(),
              name: z.string(),
              code: z.string(),
            })
            .nullable()
            .optional(),
          color: z
            .object({
              id: z.string(),
              name: z.string(),
              hex: z.string().nullable().optional(),
            })
            .nullable()
            .optional(),
          images: z.array(z.any()).optional(),
        })
        .optional(),
    }),
  );

  // Order Details
  const ZCIOrderResponse = registry.register(
    'OrderResponse',
    z.object({
      id: z.string(),
      orderNumber: z
        .string()
        .describe('Unique order number (e.g. ORD-20261110-XXXXX)'),
      status: OrderStatusEnum,
      subtotal: z.number().or(z.string()),
      discount: z.number().or(z.string()),
      deliveryFee: z.number().or(z.string()),
      tax: z.number().or(z.string()),
      total: z.number().or(z.string()),
      couponCode: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
      userId: z.string(),
      shippingAddressId: z.string().nullable().optional(),
      items: z.array(ZCIOrderItemResponse),
      payment: ZCIOrderPaymentResponse.nullable().optional(),
      shippingAddress: ZCIOrderAddressResponse.nullable().optional(),
      user: z
        .object({
          id: z.string(),
          email: z.string(),
          firstName: z.string().nullable().optional(),
          lastName: z.string().nullable().optional(),
          username: z.string().nullable().optional(),
          phone: z.string().nullable().optional(),
        })
        .optional(),
      createdAt: z.string().or(z.date()),
      updatedAt: z.string().or(z.date()),
    }),
  );

  // Paginated Orders List
  const ZCIPaginatedOrdersResponse = registry.register(
    'PaginatedOrdersResponse',
    z.object({
      success: z.boolean(),
      meta: z.object({
        page: z.number(),
        limit: z.number(),
        total: z.number(),
        totalPages: z.number(),
      }),
      data: z.array(ZCIOrderResponse),
    }),
  );

  // Single Order Envelope
  const ZCISingleOrderResponse = registry.register(
    'SingleOrderResponse',
    z.object({
      success: z.boolean(),
      data: z.object({
        order: ZCIOrderResponse,
      }),
    }),
  );

  // Mutating Order Action Envelope
  const ZCIOrderActionResponse = registry.register(
    'OrderActionResponse',
    z.object({
      success: z.boolean(),
      message: z.string(),
      data: z.object({
        order: ZCIOrderResponse,
      }),
    }),
  );

  // Error Response
  const ZCIOrderErrorResponse = registry.register(
    'OrderErrorResponse',
    z.object({
      success: z.boolean().default(false),
      message: z.string(),
    }),
  );

  // ==========================================
  // ORDER ROUTE DEFINITIONS
  // ==========================================

  // 1. Create Order (Checkout)
  registry.registerPath({
    method: 'post',
    path: '/api/v1/orders',
    tags: ['Orders'],
    summary: 'Place a new order (Checkout)',
    description:
      'Creates a new customer order either directly from their active cart or by specifying explicit items. Validates live inventory, applies coupon discount (if valid), deducts stock, creates a payment record, and clears cart items.',
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: ZCICreateOrder,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Order placed successfully',
        content: {
          'application/json': {
            schema: ZCIOrderActionResponse,
          },
        },
      },
      400: {
        description: 'Validation error, empty cart, or insufficient stock',
        content: {
          'application/json': {
            schema: ZCIOrderErrorResponse,
          },
        },
      },
      401: { description: 'Authentication required' },
      404: { description: 'Product variant or shipping address not found' },
    },
  });

  // 2. Get Authenticated User's Orders
  registry.registerPath({
    method: 'get',
    path: '/api/v1/orders/my-orders',
    tags: ['Orders'],
    summary: "Get current user's order history",
    description:
      'Retrieves a paginated list of orders placed by the authenticated customer.',
    security: [{ bearerAuth: [] }],
    request: {
      query: ZCIOrderQuery,
    },
    responses: {
      200: {
        description: "Customer's order list",
        content: {
          'application/json': {
            schema: ZCIPaginatedOrdersResponse,
          },
        },
      },
      401: { description: 'Authentication required' },
    },
  });

  // 3. Get All Orders (Admin / Staff)
  registry.registerPath({
    method: 'get',
    path: '/api/v1/orders',
    tags: ['Orders'],
    summary: 'Get all orders in system (Admin & Staff)',
    description:
      'Lists all orders across all users with filters for status, date range, order number search, and customer lookup.',
    security: [{ bearerAuth: [] }],
    request: {
      query: ZCIOrderQuery,
    },
    responses: {
      200: {
        description: 'All system orders list',
        content: {
          'application/json': {
            schema: ZCIPaginatedOrdersResponse,
          },
        },
      },
      401: { description: 'Authentication required' },
      403: {
        description: 'Forbidden: Requires ADMIN, SUPER_ADMIN, or SALESMAN role',
      },
    },
  });

  // 4. Get Order Details by ID or Order Number
  registry.registerPath({
    method: 'get',
    path: '/api/v1/orders/{id}',
    tags: ['Orders'],
    summary: 'Get order details by ID or order number',
    description:
      'Fetches complete details of an order including line items, shipping address, payment status, and order status.',
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string().describe('Order ID or Order Number (ORD-...)'),
      }),
    },
    responses: {
      200: {
        description: 'Order details',
        content: {
          'application/json': {
            schema: ZCISingleOrderResponse,
          },
        },
      },
      401: { description: 'Authentication required' },
      403: {
        description: 'Forbidden: Customers cannot view orders of other users',
      },
      404: { description: 'Order not found' },
    },
  });

  // 5. Update Order Status (Admin / Staff)
  registry.registerPath({
    method: 'patch',
    path: '/api/v1/orders/{id}/status',
    tags: ['Orders'],
    summary: 'Update order status (Admin & Staff)',
    description:
      'Transitions an order status (e.g. PENDING -> CONFIRMED -> PROCESSING -> PACKED -> SHIPPED -> DELIVERED). If cancelled or returned, automatically restocks inventory.',
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string().describe('Order ID'),
      }),
      body: {
        content: {
          'application/json': {
            schema: ZCIUpdateOrderStatus,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Order status updated successfully',
        content: {
          'application/json': {
            schema: ZCIOrderActionResponse,
          },
        },
      },
      400: { description: 'Invalid status transition' },
      401: { description: 'Authentication required' },
      403: {
        description: 'Forbidden: Requires ADMIN, SUPER_ADMIN, or SALESMAN role',
      },
      404: { description: 'Order not found' },
    },
  });

  // 6. Cancel Order
  registry.registerPath({
    method: 'post',
    path: '/api/v1/orders/{id}/cancel',
    tags: ['Orders'],
    summary: 'Cancel an order',
    description:
      'Allows a customer to cancel their order while it is still PENDING, or an Admin anytime before DELIVERED. Restocks inventory and marks payment cancelled/refunded.',
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string().describe('Order ID'),
      }),
      body: {
        content: {
          'application/json': {
            schema: ZCICancelOrder,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Order cancelled successfully',
        content: {
          'application/json': {
            schema: ZCIOrderActionResponse,
          },
        },
      },
      400: { description: 'Cannot cancel order in current status' },
      401: { description: 'Authentication required' },
      403: { description: 'Forbidden' },
      404: { description: 'Order not found' },
    },
  });

  // 7. Get Saved Shipping Addresses
  registry.registerPath({
    method: 'get',
    path: '/api/v1/orders/addresses',
    tags: ['Orders'],
    summary: "Get customer's saved shipping addresses",
    description:
      'Returns all saved shipping addresses for the authenticated user.',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'List of saved shipping addresses',
        content: {
          'application/json': {
            schema: z.object({
              success: z.boolean(),
              data: z.object({
                addresses: z.array(ZCIOrderAddressResponse),
              }),
            }),
          },
        },
      },
      401: { description: 'Authentication required' },
    },
  });

  // 8. Create Shipping Address
  registry.registerPath({
    method: 'post',
    path: '/api/v1/orders/addresses',
    tags: ['Orders'],
    summary: 'Save a new shipping address',
    description:
      'Saves a new shipping address to the authenticated customer account.',
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: ZCICreateAddress,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Shipping address created successfully',
        content: {
          'application/json': {
            schema: z.object({
              success: z.boolean(),
              message: z.string(),
              data: z.object({
                address: ZCIOrderAddressResponse,
              }),
            }),
          },
        },
      },
      400: { description: 'Validation error' },
      401: { description: 'Authentication required' },
    },
  });
};
