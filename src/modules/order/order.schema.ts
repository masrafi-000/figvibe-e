import { z } from 'zod';

export const OrderStatusEnum = z.enum([
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
  'REFUNDED',
]);

export const PaymentMethodEnum = z.enum([
  'COD',
  'STRIPE',
  'BKASH',
  'NAGAD',
  'SSL_COMMERZ',
]);

export const PaymentStatusEnum = z.enum([
  'PENDING',
  'PROCESSING',
  'PAID',
  'FAILED',
  'CANCELLED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
]);

export const AddressTypeEnum = z.enum(['HOME', 'OFFICE', 'OTHER']);

// Create / Inline Shipping Address
export const ZCICreateAddress = z.object({
  type: AddressTypeEnum.default('HOME'),
  recipientName: z
    .string()
    .trim()
    .min(1, 'Recipient name is required')
    .max(100),
  recipientPhone: z
    .string()
    .trim()
    .min(6, 'Valid recipient phone number is required')
    .max(20),
  addressLine1: z.string().trim().min(1, 'Address line 1 is required').max(255),
  addressLine2: z.string().trim().max(255).optional(),
  city: z.string().trim().min(1, 'City is required').max(100),
  district: z.string().trim().min(1, 'District is required').max(100),
  postalCode: z.string().trim().min(1, 'Postal code is required').max(20),
  country: z.string().trim().default('Bangladesh'),
  isDefault: z.boolean().default(false),
});

export type ZCTCreateAddress = z.infer<typeof ZCICreateAddress>;

// Order Item Input
export const ZCIOrderItemInput = z.object({
  variantId: z.string().cuid('Invalid variant ID'),
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(50, 'Cannot order more than 50 of a single variant'),
});

export type ZCTOrderItemInput = z.infer<typeof ZCIOrderItemInput>;

// Create Order (Checkout)
export const ZCICreateOrder = z
  .object({
    fromCart: z.boolean().default(true),
    items: z.array(ZCIOrderItemInput).optional(),
    shippingAddressId: z.string().cuid('Invalid address ID').optional(),
    shippingAddress: ZCICreateAddress.optional(),
    paymentMethod: PaymentMethodEnum.default('COD'),
    couponCode: z.string().trim().toUpperCase().optional(),
    notes: z
      .string()
      .trim()
      .max(500, 'Notes cannot exceed 500 characters')
      .optional(),
  })
  .refine((data) => Boolean(data.shippingAddressId || data.shippingAddress), {
    message: 'Either shippingAddressId or new shippingAddress must be provided',
    path: ['shippingAddressId'],
  })
  .refine(
    (data) =>
      data.fromCart || (Boolean(data.items) && (data.items?.length ?? 0) > 0),
    {
      message: 'Order items must be provided when not checking out from cart',
      path: ['items'],
    },
  );

export type ZCTCreateOrder = z.infer<typeof ZCICreateOrder>;

// Update Order Status (Admin / Staff)
export const ZCIUpdateOrderStatus = z.object({
  status: OrderStatusEnum,
  notes: z.string().trim().max(500).optional(),
});

export type ZCTUpdateOrderStatus = z.infer<typeof ZCIUpdateOrderStatus>;

// Cancel Order
export const ZCICancelOrder = z.object({
  reason: z
    .string()
    .trim()
    .min(3, 'Cancellation reason must be at least 3 characters')
    .max(300, 'Cancellation reason cannot exceed 300 characters'),
});

export type ZCTCancelOrder = z.infer<typeof ZCICancelOrder>;

// Query Filters for Orders
export const ZCIOrderQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: OrderStatusEnum.optional(),
  search: z.string().trim().optional(),
  userId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type ZCTOrderQuery = z.infer<typeof ZCIOrderQuery>;
