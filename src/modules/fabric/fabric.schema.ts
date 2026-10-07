import { z } from 'zod';

export const ZCIFabric = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  slug: z.string().min(2).max(120).trim().toLowerCase().optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(true).optional(),
});
export type ZCTFabric = z.infer<typeof ZCIFabric>;
export const ZCIUpdateFabric = ZCIFabric.partial();
export type ZCTUpdateFabric = z.infer<typeof ZCIUpdateFabric>;
export const ZCIFabricQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
});
export type ZCTFabricQuery = z.infer<typeof ZCIFabricQuery>;
