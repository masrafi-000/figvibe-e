import { z } from 'zod';

export const ZCIUserRole = z.object({
  name: z
    .string()
    .min(2, 'Role name must be at least 2 characters')
    .max(50, 'Role name cannot exceed 50 characters')
    .trim()
    .toUpperCase(),
  description: z.string().max(255).optional(),
  permissionIds: z.array(z.string().min(1)).optional(),
});

export type ZCTUserRole = z.infer<typeof ZCIUserRole>;

export const ZCIUpdateUserRole = z.object({
  name: z
    .string()
    .min(2, 'Role name must be at least 2 characters')
    .max(50, 'Role name cannot exceed 50 characters')
    .trim()
    .toUpperCase()
    .optional(),
  description: z.string().max(255).optional(),
});

export type ZCTUpdateUserRole = z.infer<typeof ZCIUpdateUserRole>;

export const ZCIPermission = z.object({
  resource: z.string().min(2, 'Resource is required').trim().toLowerCase(),
  action: z.string().min(2, 'Action is required').trim().toLowerCase(),
  description: z.string().max(255).optional(),
});

export type ZCTPermission = z.infer<typeof ZCIPermission>;

export const ZCIAssignRolePermissions = z.object({
  permissionIds: z.array(z.string().min(1), {
    message: 'permissionIds array is required',
  }),
});

export type ZCTAssignRolePermissions = z.infer<typeof ZCIAssignRolePermissions>;

export const ZCIAssignUserRole = z.object({
  roleId: z.string().min(1, 'roleId is required'),
});

export type ZCTAssignUserRole = z.infer<typeof ZCIAssignUserRole>;

export const ZCIUserQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED']).optional(),
  role: z.string().trim().optional(),
});

export type ZCTUserQuery = z.infer<typeof ZCIUserQuery>;
