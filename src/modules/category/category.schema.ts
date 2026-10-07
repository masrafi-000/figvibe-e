import { optional, tuple, z } from 'zod';

export const ZCICategory = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters long')
    .max(100)
    .trim(),
  slug: z.string().min(2).max(120).trim().toLowerCase().optional(),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url('Ivalid image URL').optional().or(z.literal('')),
  parentId: z.string().min(1).optional().nullable(),
  isActive: z.boolean().default(true).optional(),
});

export type ZCTCategory = z.infer<typeof ZCICategory>;

export const ZCIUpdateCategory = ZCICategory.partial();
export type ZCTUpdateCategory = z.infer<typeof ZCIUpdateCategory>;

export const ZCICategoryQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  parentId: z.string().optional().nullable(),
  includeChildren: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
});

export type ZCTCategoryQuery = z.infer<typeof ZCICategoryQuery>;
