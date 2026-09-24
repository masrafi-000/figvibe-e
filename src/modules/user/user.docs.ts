import {
  extendZodWithOpenApi,
  type OpenAPIRegistry,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  ZCIAssignRolePermissions,
  ZCIAssignUserRole,
  ZCIPermission,
  ZCIUpdateUserRole,
  ZCIUserRole,
} from './user.schema';

extendZodWithOpenApi(z);

export const registerUserDocs = (registry: OpenAPIRegistry): void => {
  // Permission Model Schema
  const ZCIPermissionResponse = registry.register(
    'PermissionResponse',
    z.object({
      id: z.string(),
      resource: z.string(),
      action: z.string(),
      description: z.string().nullable().optional(),
      createdAt: z.string().optional(),
    }),
  );

  // Role Model Schema
  const ZCIRoleResponse = registry.register(
    'RoleResponse',
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().nullable().optional(),
      userCount: z.number().optional(),
      permissionCount: z.number().optional(),
      permissions: z.array(ZCIPermissionResponse).optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
    }),
  );

  // User Safe Schema
  const ZCISafeUserResponse = registry.register(
    'SafeUserResponse',
    z.object({
      id: z.string(),
      email: z.string(),
      emailVerified: z.string().nullable().optional(),
      firstName: z.string().nullable().optional(),
      lastName: z.string().nullable().optional(),
      username: z.string().nullable().optional(),
      avatarUrl: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED']),
      roleId: z.string(),
      role: z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().nullable().optional(),
      }),
      createdAt: z.string(),
      updatedAt: z.string(),
      lastLoginAt: z.string().nullable().optional(),
    }),
  );

  // Paginated Users Schema
  const ZCIPaginatedUsersResponse = registry.register(
    'PaginatedUsersResponse',
    z.object({
      success: z.boolean(),
      meta: z.object({
        page: z.number(),
        limit: z.number(),
        total: z.number(),
        totalPage: z.number(),
      }),
      data: z.array(ZCISafeUserResponse),
    }),
  );

  // ==========================================
  // ROLES DOCUMENTATION
  // ==========================================

  // List all roles
  registry.registerPath({
    method: 'get',
    path: '/api/v1/users/roles',
    tags: ['Roles'],
    summary: 'Get all user roles with permission counts',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'List of all system and custom roles',
        content: {
          'application/json': {
            schema: z.object({
              success: z.boolean(),
              data: z.object({
                roles: z.array(ZCIRoleResponse),
              }),
            }),
          },
        },
      },
      401: { description: 'Authentication required' },
      403: { description: 'Forbidden: Insufficient permissions' },
    },
  });

  // Get role by ID
  registry.registerPath({
    method: 'get',
    path: '/api/v1/users/roles/{id}',
    tags: ['Roles'],
    summary: 'Get role details by ID',
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string(),
      }),
    },
    responses: {
      200: {
        description: 'Role details with attached permissions',
        content: {
          'application/json': {
            schema: z.object({
              success: z.boolean(),
              data: z.object({
                role: ZCIRoleResponse,
              }),
            }),
          },
        },
      },
      404: { description: 'Role not found' },
    },
  });

  // Create role
  registry.registerPath({
    method: 'post',
    path: '/api/v1/users/roles',
    tags: ['Roles'],
    summary: 'Create a new role with optional initial permissions',
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: ZCIUserRole,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Role created successfully',
        content: {
          'application/json': {
            schema: z.object({
              success: z.boolean(),
              message: z.string(),
              data: z.object({
                role: ZCIRoleResponse,
              }),
            }),
          },
        },
      },
      400: { description: 'Validation error or invalid permission IDs' },
      409: { description: 'Role name already exists' },
    },
  });

  // Update role
  registry.registerPath({
    method: 'patch',
    path: '/api/v1/users/roles/{id}',
    tags: ['Roles'],
    summary: 'Update role name or description',
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string(),
      }),
      body: {
        content: {
          'application/json': {
            schema: ZCIUpdateUserRole,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Role updated successfully',
        content: {
          'application/json': {
            schema: z.object({
              success: z.boolean(),
              message: z.string(),
              data: z.object({
                role: ZCIRoleResponse,
              }),
            }),
          },
        },
      },
      400: { description: 'Cannot rename core system role' },
      404: { description: 'Role not found' },
    },
  });

  // Delete role
  registry.registerPath({
    method: 'delete',
    path: '/api/v1/users/roles/{id}',
    tags: ['Roles'],
    summary: 'Delete a custom role',
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string(),
      }),
    },
    responses: {
      200: {
        description: 'Role deleted successfully',
        content: {
          'application/json': {
            schema: z.object({
              success: z.boolean(),
              message: z.string(),
            }),
          },
        },
      },
      400: {
        description:
          'Cannot delete core system roles or roles with assigned users',
      },
      404: { description: 'Role not found' },
    },
  });

  // Assign permissions to role
  registry.registerPath({
    method: 'put',
    path: '/api/v1/users/roles/{id}/permissions',
    tags: ['Roles'],
    summary: 'Assign or sync permissions to a role (replaces existing)',
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string(),
      }),
      body: {
        content: {
          'application/json': {
            schema: ZCIAssignRolePermissions,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Permissions assigned and Redis cache invalidated',
        content: {
          'application/json': {
            schema: z.object({
              success: z.boolean(),
              message: z.string(),
              data: z.object({
                role: ZCIRoleResponse,
              }),
            }),
          },
        },
      },
      400: { description: 'Invalid permission IDs' },
      404: { description: 'Role not found' },
    },
  });

  // Remove permissions from role
  registry.registerPath({
    method: 'delete',
    path: '/api/v1/users/roles/{id}/permissions',
    tags: ['Roles'],
    summary: 'Remove specific permissions from a role',
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string(),
      }),
      body: {
        content: {
          'application/json': {
            schema: ZCIAssignRolePermissions,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Permissions removed and Redis cache invalidated',
        content: {
          'application/json': {
            schema: z.object({
              success: z.boolean(),
              message: z.string(),
              data: z.object({
                role: ZCIRoleResponse,
              }),
            }),
          },
        },
      },
      404: { description: 'Role not found' },
    },
  });

  // ==========================================
  // PERMISSIONS DOCUMENTATION
  // ==========================================

  // List all permissions
  registry.registerPath({
    method: 'get',
    path: '/api/v1/users/permissions',
    tags: ['Permissions'],
    summary: 'Get all available system permissions',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'List of all system permissions',
        content: {
          'application/json': {
            schema: z.object({
              success: z.boolean(),
              data: z.object({
                permissions: z.array(ZCIPermissionResponse),
              }),
            }),
          },
        },
      },
    },
  });

  // Create permission
  registry.registerPath({
    method: 'post',
    path: '/api/v1/users/permissions',
    tags: ['Permissions'],
    summary: 'Create a new permission resource:action',
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: ZCIPermission,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Permission created successfully',
        content: {
          'application/json': {
            schema: z.object({
              success: z.boolean(),
              message: z.string(),
              data: z.object({
                permission: ZCIPermissionResponse,
              }),
            }),
          },
        },
      },
      409: { description: 'Permission already exists' },
    },
  });

  // Delete permission
  registry.registerPath({
    method: 'delete',
    path: '/api/v1/users/permissions/{id}',
    tags: ['Permissions'],
    summary: 'Delete a permission',
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string(),
      }),
    },
    responses: {
      200: {
        description: 'Permission deleted successfully',
        content: {
          'application/json': {
            schema: z.object({
              success: z.boolean(),
              message: z.string(),
            }),
          },
        },
      },
      404: { description: 'Permission not found' },
    },
  });

  // ==========================================
  // USERS DOCUMENTATION
  // ==========================================

  // List users
  registry.registerPath({
    method: 'get',
    path: '/api/v1/users',
    tags: ['Users'],
    summary: 'Search and paginate all users',
    security: [{ bearerAuth: [] }],
    request: {
      query: z.object({
        page: z.number().optional(),
        limit: z.number().optional(),
        search: z.string().optional(),
        status: z
          .enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED'])
          .optional(),
        role: z.string().optional(),
      }),
    },
    responses: {
      200: {
        description: 'Paginated user records',
        content: {
          'application/json': {
            schema: ZCIPaginatedUsersResponse,
          },
        },
      },
    },
  });

  // Get user by ID
  registry.registerPath({
    method: 'get',
    path: '/api/v1/users/{id}',
    tags: ['Users'],
    summary: 'Get user details by ID',
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string(),
      }),
    },
    responses: {
      200: {
        description: 'User details',
        content: {
          'application/json': {
            schema: z.object({
              success: z.boolean(),
              data: z.object({
                user: ZCISafeUserResponse,
              }),
            }),
          },
        },
      },
      404: { description: 'User not found' },
    },
  });

  // Assign role to user
  registry.registerPath({
    method: 'patch',
    path: '/api/v1/users/{id}/role',
    tags: ['Users'],
    summary: 'Assign a role to a user',
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string(),
      }),
      body: {
        content: {
          'application/json': {
            schema: ZCIAssignUserRole,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'User role updated and cache invalidated',
        content: {
          'application/json': {
            schema: z.object({
              success: z.boolean(),
              message: z.string(),
              data: z.object({
                user: ZCISafeUserResponse,
              }),
            }),
          },
        },
      },
      404: { description: 'User or Role not found' },
    },
  });

  // Reset user role to default
  registry.registerPath({
    method: 'patch',
    path: '/api/v1/users/{id}/reset-role',
    tags: ['Users'],
    summary: 'Reset user role to default CUSTOMER role',
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string(),
      }),
    },
    responses: {
      200: {
        description: 'User role reset to CUSTOMER',
        content: {
          'application/json': {
            schema: z.object({
              success: z.boolean(),
              message: z.string(),
              data: z.object({
                user: ZCISafeUserResponse,
              }),
            }),
          },
        },
      },
      404: { description: 'User not found' },
    },
  });

  // Suspend user
  registry.registerPath({
    method: 'patch',
    path: '/api/v1/users/{id}/suspend',
    tags: ['Users'],
    summary: 'Suspend a user account and revoke all login sessions',
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string(),
      }),
    },
    responses: {
      200: {
        description: 'User suspended',
        content: {
          'application/json': {
            schema: z.object({
              success: z.boolean(),
              message: z.string(),
              data: z.object({
                user: ZCISafeUserResponse,
              }),
            }),
          },
        },
      },
      403: { description: 'Cannot suspend SUPER_ADMIN accounts' },
      404: { description: 'User not found' },
    },
  });

  // Unsuspend user
  registry.registerPath({
    method: 'patch',
    path: '/api/v1/users/{id}/unsuspend',
    tags: ['Users'],
    summary: 'Reactivate a suspended user account',
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string(),
      }),
    },
    responses: {
      200: {
        description: 'User reactivated',
        content: {
          'application/json': {
            schema: z.object({
              success: z.boolean(),
              message: z.string(),
              data: z.object({
                user: ZCISafeUserResponse,
              }),
            }),
          },
        },
      },
      404: { description: 'User not found' },
    },
  });

  // Soft delete user
  registry.registerPath({
    method: 'delete',
    path: '/api/v1/users/{id}/soft',
    tags: ['Users'],
    summary: 'Soft delete a user account',
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string(),
      }),
    },
    responses: {
      200: {
        description: 'User soft-deleted',
        content: {
          'application/json': {
            schema: z.object({
              success: z.boolean(),
              message: z.string(),
              data: z.object({
                user: ZCISafeUserResponse,
              }),
            }),
          },
        },
      },
      403: { description: 'Cannot delete SUPER_ADMIN accounts' },
      404: { description: 'User not found' },
    },
  });

  // Permanently delete user
  registry.registerPath({
    method: 'delete',
    path: '/api/v1/users/{id}',
    tags: ['Users'],
    summary: 'Permanently delete a user account from database',
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string(),
      }),
    },
    responses: {
      200: {
        description: 'User deleted permanently',
        content: {
          'application/json': {
            schema: z.object({
              success: z.boolean(),
              message: z.string(),
            }),
          },
        },
      },
      403: { description: 'Cannot delete SUPER_ADMIN accounts' },
      404: { description: 'User not found' },
    },
  });

  // Revoke all sessions
  registry.registerPath({
    method: 'post',
    path: '/api/v1/users/{id}/revoke-sessions',
    tags: ['Users'],
    summary: 'Revoke all active login sessions for a user',
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string(),
      }),
    },
    responses: {
      200: {
        description: 'Sessions revoked',
        content: {
          'application/json': {
            schema: z.object({
              success: z.boolean(),
              message: z.string(),
              data: z.object({
                revokedCount: z.number(),
              }),
            }),
          },
        },
      },
      404: { description: 'User not found' },
    },
  });
};
