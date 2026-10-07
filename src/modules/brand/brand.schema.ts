import { z } from 'zod';

export const ZCIBrand = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  slug: z.string().min(2).max(120).trim().toLowerCase().optional(),
  description: z.string().max(500).optional(),
  logoUrl: z.string().url('Invalid logo URL').optional().or(z.literal('')),
  isActive: z.boolean().default(true).optional(),
});

export type ZCTBrand = z.infer<typeof ZCIBrand>;

export const ZCIUpdateBrand = ZCIBrand.partial();
export type ZCTUpdateBrand = z.infer<typeof ZCIUpdateBrand>;

export const ZCIBrandQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
});

export type ZCTBrandQuery = z.infer<typeof ZCIBrandQuery>;
