import { z } from 'zod';
import {
  OrderStatusEnum,
  PaymentMethodEnum,
  PaymentStatusEnum,
  ZCICreateAddress,
} from '../order/order.schema';

export const DeliveryTypeEnum = z.enum(['STORE_PICKUP', 'HOME_DELIVERY']);
export type DeliveryType = z.infer<typeof DeliveryTypeEnum>;

export const OrderChannelEnum = z.enum(['ONLINE', 'POS']);
export type OrderChannel = z.infer<typeof OrderChannelEnum>;

// POS Line Item Input
export const ZCIPosOrderItem = z.object({
  variantId: z.string().cuid('Invalid product variant ID'),
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(100, 'Maximum 100 units per line item'),
});

export type ZCTPosOrderItem = z.infer<typeof ZCIPosOrderItem>;

// In-Store / POS Order Creation
export const ZCIPosCreateOrder = z
  .object({
    items: z
      .array(ZCIPosOrderItem)
      .min(1, 'Order must contain at least one item'),

    // Customer Information
    customerName: z.string().trim().min(1).default('Walk-in Customer'),
    customerPhone: z.string().trim().optional(),
    customerEmail: z
      .string()
      .trim()
      .email('Invalid email address')
      .optional()
      .or(z.literal('')),

    // Payment Information
    paymentMethod: PaymentMethodEnum.default('CASH'),
    transactionId: z.string().trim().optional(),
    amountReceived: z.number().positive().optional(),

    // Delivery Processing
    deliveryType: DeliveryTypeEnum.default('STORE_PICKUP'),
    shippingAddressId: z.string().cuid().optional(),
    shippingAddress: ZCICreateAddress.optional(),

    // Discounts & Notes
    discountAmount: z.coerce.number().min(0).default(0),
    couponCode: z.string().trim().toUpperCase().optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine(
    (data) => {
      // If digital payment (Card, bKash, Nagad, etc.), require transactionId
      if (
        data.paymentMethod !== 'CASH' &&
        data.paymentMethod !== 'COD' &&
        !data.transactionId
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Transaction ID is required for online, card, or MFS payments',
      path: ['transactionId'],
    },
  )
  .refine(
    (data) => {
      // If HOME_DELIVERY, address is required
      if (data.deliveryType === 'HOME_DELIVERY') {
        return Boolean(data.shippingAddressId || data.shippingAddress);
      }
      return true;
    },
    {
      message: 'Shipping address is required when selecting Home Delivery',
      path: ['shippingAddressId'],
    },
  );

export type ZCTPosCreateOrder = z.infer<typeof ZCIPosCreateOrder>;

// Delivery Update Schema
export const ZCIPosDeliveryUpdate = z.object({
  status: OrderStatusEnum,
  notes: z.string().trim().max(500).optional(),
});

export type ZCTPosDeliveryUpdate = z.infer<typeof ZCIPosDeliveryUpdate>;

// POS Query Filters
export const ZCIPosSalesQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: OrderStatusEnum.optional(),
  paymentMethod: PaymentMethodEnum.optional(),
  deliveryType: DeliveryTypeEnum.optional(),
  salesmanId: z.string().optional(),
  search: z.string().trim().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type ZCTPosSalesQuery = z.infer<typeof ZCIPosSalesQuery>;

// Salesmen Performance Query
export const ZCIPosPerformanceQuery = z.object({
  salesmanId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type ZCTPosPerformanceQuery = z.infer<typeof ZCIPosPerformanceQuery>;

// Send / Resend Invoice
export const ZCISendInvoice = z.object({
  email: z.string().trim().email('Invalid email address').optional(),
});

export type ZCTSendInvoice = z.infer<typeof ZCISendInvoice>;

