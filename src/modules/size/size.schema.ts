import { z } from 'zod';

export const ZCISize = z.object({
  name: z.string().min(1, 'Size name is required'),
  code: z.string().min(1, 'Size code is required'),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const ZCIUpdateSize = ZCISize.partial();

export const ZCISizeQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  search: z.string().optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
});

export type ZCTSize = z.infer<typeof ZCISize>;
export type ZCTUpdateSize = z.infer<typeof ZCIUpdateSize>;
export type ZCTSizeQuery = z.infer<typeof ZCISizeQuery>;
