import { z } from 'zod';

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

export const ZCIColorQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  search: z.string().optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
});

export type ZCTColor = z.infer<typeof ZCIColor>;
export type ZCTUpdateColor = z.infer<typeof ZCIUpdateColor>;
export type ZCTColorQuery = z.infer<typeof ZCIColorQuery>;
