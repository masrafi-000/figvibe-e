import z from 'zod';

export const ZCIAuditLogQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  resource: z.string().trim().optional(),
  resourceId: z.string().trim().optional(),

  action: z
    .enum([
      'CREATE',
      'UPDATE',
      'DELETE',
      'LOGIN',
      'LOGOUT',
      'PASSWORD_CHANGE',
      'ROLE_CHANGE',
      'STATUS_CHANGE',
      'EXPORT',
      'IMPERSONATE',
      'BULK_UPDATE',
      'BULK_DELETE',
    ])
    .optional(),
  status: z.enum(['SUCCESS', 'FAILED']).optional(),
  actorId: z.string().trim().optional(),
  actorType: z
    .enum(['USER', 'SYSTEM', 'WEBHOOK', 'API_KEY', 'ANONYMOUS'])
    .optional(),
  startDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().date())
    .optional(),
  endDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().date())
    .optional(),
  search: z.string().trim().optional(),
});

export type ZCTAuditLogQuery = z.infer<typeof ZCIAuditLogQuery>;
