import {
  extendZodWithOpenApi,
  type OpenAPIRegistry,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  ZCIPosCreateOrder,
  ZCIPosDeliveryUpdate,
  ZCIPosPerformanceQuery,
  ZCIPosSalesQuery,
  ZCISendInvoice,
} from './pos.schema';

extendZodWithOpenApi(z);

export const registerPosDocs = (registry: OpenAPIRegistry): void => {
  // Salesman Summary Schema
  const ZCIPosSummaryResponse = registry.register(
    'PosSummaryResponse',
    z.object({
      success: z.boolean(),
      data: z.object({
        today: z.object({
          ordersCount: z.number(),
          revenue: z.number(),
        }),
        thisWeek: z.object({
          ordersCount: z.number(),
          revenue: z.number(),
        }),
        thisMonth: z.object({
          ordersCount: z.number(),
          revenue: z.number(),
        }),
        lifetime: z.object({
          ordersCount: z.number(),
          revenue: z.number(),
          averageOrderValue: z.number(),
        }),
        topSellingItems: z.array(
          z.object({
            variantId: z.string(),
            productName: z.string(),
            variantName: z.string().nullable().optional(),
            sku: z.string(),
            totalQuantitySold: z.number(),
            totalRevenue: z.number(),
          }),
        ),
      }),
    }),
  );

  // Salesmen Performance Leaderboard Schema
  const ZCIPosPerformanceResponse = registry.register(
    'PosPerformanceResponse',
    z.object({
      success: z.boolean(),
      data: z.array(
        z.object({
          salesmanId: z.string().nullable(),
          salesman: z
            .object({
              id: z.string(),
              firstName: z.string().nullable().optional(),
              lastName: z.string().nullable().optional(),
              username: z.string().nullable().optional(),
              email: z.string(),
              phone: z.string().nullable().optional(),
            })
            .nullable()
            .optional(),
          totalOrders: z.number(),
          totalRevenue: z.number(),
          averageOrderValue: z.number(),
        }),
      ),
    }),
  );

  // Variant Sales Report Schema
  const ZCIPosVariantReportResponse = registry.register(
    'PosVariantReportResponse',
    z.object({
      success: z.boolean(),
      data: z.array(
        z.object({
          variantId: z.string(),
          productName: z.string(),
          variantName: z.string().nullable().optional(),
          sku: z.string(),
          _sum: z.object({
            quantity: z.number().nullable().optional(),
            totalPrice: z.number().nullable().optional(),
          }),
        }),
      ),
    }),
  );

  // ==========================================
  // POS & STORE SALES ROUTE DEFINITIONS
  // ==========================================

  // 1. Create In-Store POS Order
  registry.registerPath({
    method: 'post',
    path: '/api/v1/pos/orders',
    tags: ['POS & Physical Store Sales'],
    summary: 'Create in-store POS order (Checkout)',
    description:
      'Salesman creates an order for a walk-in or registered customer directly from the physical store. Deducts live stock, records payment (CASH or MFS/Card with transactionId), links order to the salesman, and sends an optional invoice email.',
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: ZCIPosCreateOrder,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'POS order created successfully',
      },
      400: { description: 'Validation error or insufficient inventory' },
      401: { description: 'Authentication required' },
      403: {
        description: 'Forbidden: Requires SALESMAN, ADMIN, or SUPER_ADMIN role',
      },
    },
  });

  // 2. Salesman: Get Own Sales
  registry.registerPath({
    method: 'get',
    path: '/api/v1/pos/my-sales',
    tags: ['POS & Physical Store Sales'],
    summary: 'Get current salesman sales history',
    description:
      'Retrieves all physical store orders created by the logged-in salesman with date and status filters.',
    security: [{ bearerAuth: [] }],
    request: {
      query: ZCIPosSalesQuery,
    },
    responses: {
      200: {
        description: 'List of sales created by the salesman',
      },
      401: { description: 'Authentication required' },
    },
  });

  // 3. Salesman: Get Dashboard Summary
  registry.registerPath({
    method: 'get',
    path: '/api/v1/pos/my-summary',
    tags: ['POS & Physical Store Sales'],
    summary: 'Get salesman dashboard metrics',
    description:
      "Returns today's, this week's, and this month's revenue, order counts, and top-selling variants for the logged-in salesman.",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Salesman summary statistics',
        content: {
          'application/json': {
            schema: ZCIPosSummaryResponse,
          },
        },
      },
      401: { description: 'Authentication required' },
    },
  });

  // 4. Update Delivery Status
  registry.registerPath({
    method: 'patch',
    path: '/api/v1/pos/orders/{id}/deliver',
    tags: ['POS & Physical Store Sales'],
    summary: 'Process store order delivery or handover',
    description:
      'Updates delivery status of an in-store order (e.g., mark as DELIVERED upon customer handover).',
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string().describe('Order ID'),
      }),
      body: {
        content: {
          'application/json': {
            schema: ZCIPosDeliveryUpdate,
          },
        },
      },
    },
    responses: {
      200: { description: 'Order delivery status updated successfully' },
      401: { description: 'Authentication required' },
      404: { description: 'Order not found' },
    },
  });

  // 5. Send / Resend Invoice Email
  registry.registerPath({
    method: 'post',
    path: '/api/v1/pos/orders/{id}/invoice',
    tags: ['POS & Physical Store Sales'],
    summary: 'Send or resend invoice email to customer',
    description:
      'Dispatches a digital receipt/invoice to the customer email address via background BullMQ worker.',
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string().describe('Order ID'),
      }),
      body: {
        content: {
          'application/json': {
            schema: ZCISendInvoice,
          },
        },
      },
    },
    responses: {
      200: { description: 'Invoice queued for delivery' },
      400: { description: 'No email address on record' },
      401: { description: 'Authentication required' },
      404: { description: 'Order not found' },
    },
  });

  // 6. Admin: Get All POS Sales
  registry.registerPath({
    method: 'get',
    path: '/api/v1/pos/sales',
    tags: ['POS & Physical Store Sales'],
    summary: 'Admin: View all in-store sales',
    description:
      'Lists all physical store sales across all salesmen and outlets with filtering by salesman, date range, and payment method.',
    security: [{ bearerAuth: [] }],
    request: {
      query: ZCIPosSalesQuery,
    },
    responses: {
      200: { description: 'All in-store sales records' },
      401: { description: 'Authentication required' },
      403: { description: 'Forbidden: Requires ADMIN or SUPER_ADMIN role' },
    },
  });

  // 7. Admin: Salesmen Performance Leaderboard
  registry.registerPath({
    method: 'get',
    path: '/api/v1/pos/performance',
    tags: ['POS & Physical Store Sales'],
    summary: 'Admin: Salesmen performance and leaderboard',
    description:
      'Provides a revenue and order volume breakdown for each salesman over a selectable date range.',
    security: [{ bearerAuth: [] }],
    request: {
      query: ZCIPosPerformanceQuery,
    },
    responses: {
      200: {
        description: 'Salesmen performance rankings',
        content: {
          'application/json': {
            schema: ZCIPosPerformanceResponse,
          },
        },
      },
      401: { description: 'Authentication required' },
      403: { description: 'Forbidden: Requires ADMIN or SUPER_ADMIN role' },
    },
  });

  // 8. Admin: Variant Sales Report
  registry.registerPath({
    method: 'get',
    path: '/api/v1/pos/reports/variant-sales',
    tags: ['POS & Physical Store Sales'],
    summary: 'Admin: Variant sales breakdown',
    description:
      'Tracks which product variants were sold, total quantities, and revenue generated, filterable by salesman.',
    security: [{ bearerAuth: [] }],
    request: {
      query: ZCIPosPerformanceQuery,
    },
    responses: {
      200: {
        description: 'Variant sales breakdown report',
        content: {
          'application/json': {
            schema: ZCIPosVariantReportResponse,
          },
        },
      },
      401: { description: 'Authentication required' },
      403: { description: 'Forbidden: Requires ADMIN or SUPER_ADMIN role' },
    },
  });
};
