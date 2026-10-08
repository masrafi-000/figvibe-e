import { z } from 'zod';

export const ProductStatusEnum = z.enum([
  'DRAFT',
  'ACTIVE',
  'INACTIVE',
  'ARCHIVED',
]);

// Size Schema
export const ZCISize = z.object({
  name: z.string().min(1, 'Size name is required'),
  code: z.string().min(1, 'Size code is required'),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const ZCIUpdateSize = ZCISize.partial();

// Color Schema
export const ZCIColor = z.object({
  name: z.string().min(1, 'Color name is required'),
  slug: z.string().optional(),
  hex: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid HEX color code')
    .optional(),
  isActive: z.boolean().default(true),
});

export const ZCIUpdateColor = ZCIColor.partial();

// Product Variant Schema
export const ZCIProductVariant = z.object({
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional(),
  price: z.number().positive('Price must be a positive number'),
  comparePrice: z
    .number()
    .positive('Compare price must be positive')
    .optional(),
  costPrice: z.number().positive('Cost price must be positive').optional(),
  isActive: z.boolean().default(true),
  sizeId: z.string().min(1, 'Size ID is required'),
  colorId: z.string().min(1, 'Color ID is required'),
});

export const ZCIUpdateProductVariant = ZCIProductVariant.partial().omit({
  sizeId: true,
  colorId: true,
});

// Product Image Schema
export const ZCIProductImage = z.object({
  url: z.string().min(1, 'Image URL is required'),
  altText: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isPrimary: z.boolean().default(false),
  variantId: z.string().optional(),
});

// Create Product Schema
export const ZCIProduct = z.object({
  name: z.string().min(1, 'Product name is required'),
  slug: z.string().optional(),
  description: z.string().optional(),
  status: ProductStatusEnum.default('DRAFT'),
  categoryId: z.string().min(1, 'Category ID is required'),
  brandId: z.string().optional().nullable(),
  fabricId: z.string().optional().nullable(),
  variants: z.array(ZCIProductVariant).optional().default([]),
  images: z.array(ZCIProductImage).optional().default([]),
});

// Update Product Schema
export const ZCIUpdateProduct = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  status: ProductStatusEnum.optional(),
  categoryId: z.string().min(1).optional(),
  brandId: z.string().optional().nullable(),
  fabricId: z.string().optional().nullable(),
});

// Product Query / Filter Schema
export const ZCIProductQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  fabricId: z.string().optional(),
  status: ProductStatusEnum.optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  sortBy: z.enum(['createdAt', 'price', 'name']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Export Infer Types
export type ZCTSize = z.infer<typeof ZCISize>;
export type ZCTColor = z.infer<typeof ZCIColor>;
export type ZCTProductVariant = z.infer<typeof ZCIProductVariant>;
export type ZCTUpdateProductVariant = z.infer<typeof ZCIUpdateProductVariant>;
export type ZCTProductImage = z.infer<typeof ZCIProductImage>;
export type ZCTProduct = z.infer<typeof ZCIProduct>;
export type ZCTUpdateProduct = z.infer<typeof ZCIUpdateProduct>;
export type ZCTProductQuery = z.infer<typeof ZCIProductQuery>;
