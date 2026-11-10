import { z } from 'zod';

export const MAX_QTY_PER_ITEM = 10;
export const MAX_DISTINCT_ITEMS = 50;

export const ZCIAddToCart = z.object({
  variantId: z.string().cuid('Invalid product variant ID'),
  quantity: z.coerce
    .number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1').max(MAX_QTY_PER_ITEM)
    .default(1),
});

export type ZCTAddToCart = z.infer<typeof ZCIAddToCart>;

export const ZCIUpdateCartItem = z.object({
  quantity: z.coerce
    .number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1'),
});

export type ZCTUpdateCartItem = z.infer<typeof ZCIUpdateCartItem>;
