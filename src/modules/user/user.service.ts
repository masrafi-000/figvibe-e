import { permissionCache } from '../../common/services/permission.cache';
import { AppError } from '../../common/utils/AppError';
import type { Database } from '../../db/prisma';
import type { Prisma, UserStatus } from '../../generated/prisma/client';
import type {
  ZCTPermission,
  ZCTUpdateUserRole,
  ZCTUserQuery,
  ZCTUserRole,
} from './user.schema';

const USER_SAFE_SELECT = {
  id: true,
  email: true,
  emailVerified: true,
  firstName: true,
  lastName: true,
  username: true,
  avatarUrl: true,
  phone: true,
  status: true,
  roleId: true,
  role: {
    select: {
      id: true,
      name: true,
      description: true,
    },
  },
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
} as const;

const SYSTEM_ROLES = ['SUPER_ADMIN', 'ADMIN', 'SALESMAN', 'CUSTOMER'] as const;

export class UserService {
  constructor(private readonly database: Database) {}

  private get prisma() {
    return this.database.client;
  }

  // USER MANAGEMENT
  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_SAFE_SELECT,
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  async getAllUsers(query: ZCTUserQuery) {
    const { page = 1, limit = 10, search, status, role } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (status) {
      where.status = status as UserStatus;
    }

    if (role) {
      where.role = { name: role.toUpperCase() };
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: USER_SAFE_SELECT,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      meta: {
        page,
        limit,
        total,
        totalPage: Math.ceil(total / limit),
      },
      data: users,
    };
  }

  async suspendUser(userId: string) {
    const existingUser = await this.getUserById(userId);

    if (existingUser.role.name === 'SUPER_ADMIN') {
      throw new AppError('Cannot suspend SUPER_ADMIN accounts', 403);
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: { status: 'SUSPENDED' },
        select: USER_SAFE_SELECT,
      });

      await tx.authSession.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });

      return updated;
    });

    await permissionCache.invalidateUser(userId);

    return user;
  }

  async unsuspendUser(userId: string) {
    await this.getUserById(userId);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE' },
      select: USER_SAFE_SELECT,
    });

    await permissionCache.invalidateUser(userId);

    return user;
  }

  async softDeleteUser(userId: string) {
    const existingUser = await this.getUserById(userId);

    if (existingUser.role.name === 'SUPER_ADMIN') {
      throw new AppError('Cannot delete SUPER_ADMIN accounts', 403);
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: { status: 'DELETED' },
        select: USER_SAFE_SELECT,
      });

      await tx.authSession.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });

      return updated;
    });

    await permissionCache.invalidateUser(userId);

    return user;
  }

  async deleteUserPermanently(userId: string) {
    const existingUser = await this.getUserById(userId);

    if (existingUser.role.name === 'SUPER_ADMIN') {
      throw new AppError('Cannot permanently delete SUPER_ADMIN accounts', 403);
    }

    await this.prisma.user.delete({
      where: { id: userId },
    });

    await permissionCache.invalidateUser(userId);
  }

  async assignRoleToUser(userId: string, roleId: string) {
    await this.getUserById(userId);

    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new AppError('Target role does not exist', 404);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { roleId },
      select: USER_SAFE_SELECT,
    });

    // Invalidate Redis cache so updated permissions take effect immediately
    await permissionCache.invalidateUser(userId);

    return updatedUser;
  }

  async resetUserRoleToDefault(userId: string) {
    await this.getUserById(userId);

    const defaultRole = await this.prisma.role.findUnique({
      where: { name: 'CUSTOMER' },
    });

    if (!defaultRole) {
      throw new AppError('Default CUSTOMER role not found in database', 500);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { roleId: defaultRole.id },
      select: USER_SAFE_SELECT,
    });

    await permissionCache.invalidateUser(userId);

    return updatedUser;
  }

  async revokeAllUserSessions(userId: string) {
    await this.getUserById(userId);

    const result = await this.prisma.authSession.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });

    return {
      message: 'All active sessions revoked successfully',
      revokedCount: result.count,
    };
  }

  // ==========================================
  // ROLE MANAGEMENT
  // ==========================================

  async getAllRoles() {
    const roles = await this.prisma.role.findMany({
      include: {
        _count: {
          select: { users: true, permission: true },
        },
        permission: {
          select: {
            permission: {
              select: {
                id: true,
                resource: true,
                action: true,
                description: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      userCount: role._count.users,
      permissionCount: role._count.permission,
      permissions: role.permission.map((rp) => rp.permission),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));
  }

  async getRoleById(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        _count: {
          select: { users: true, permission: true },
        },
        permission: {
          select: {
            permission: {
              select: {
                id: true,
                resource: true,
                action: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!role) {
      throw new AppError('Role not found', 404);
    }

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      userCount: role._count.users,
      permissionCount: role._count.permission,
      permissions: role.permission.map((rp) => rp.permission),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  async createRole(payload: ZCTUserRole) {
    const normalizedName = payload.name.trim().toUpperCase();

    const existingRole = await this.prisma.role.findUnique({
      where: { name: normalizedName },
    });

    if (existingRole) {
      throw new AppError(`Role '${normalizedName}' already exists`, 409);
    }

    // If permissionIds provided, ensure they exist
    if (payload.permissionIds && payload.permissionIds.length > 0) {
      const validPermissionsCount = await this.prisma.permission.count({
        where: { id: { in: payload.permissionIds } },
      });

      if (validPermissionsCount !== payload.permissionIds.length) {
        throw new AppError('One or more permission IDs are invalid', 400);
      }
    }

    const role = await this.prisma.role.create({
      data: {
        name: normalizedName,
        description: payload.description,
        ...(payload.permissionIds && payload.permissionIds.length > 0
          ? {
              permission: {
                create: payload.permissionIds.map((permissionId) => ({
                  permissionId,
                })),
              },
            }
          : {}),
      },
      include: {
        permission: {
          select: {
            permission: true,
          },
        },
      },
    });

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permission.map((rp) => rp.permission),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  async updateRole(roleId: string, payload: ZCTUpdateUserRole) {
    const existingRole = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!existingRole) {
      throw new AppError('Role not found', 404);
    }

    const data: Prisma.RoleUpdateInput = {};

    if (payload.name) {
      const normalizedName = payload.name.trim().toUpperCase();

      if (SYSTEM_ROLES.includes(existingRole.name as any) && existingRole.name !== normalizedName) {
        throw new AppError(`Cannot rename core system role '${existingRole.name}'`, 400);
      }

      if (normalizedName !== existingRole.name) {
        const nameConflict = await this.prisma.role.findUnique({
          where: { name: normalizedName },
        });
        if (nameConflict) {
          throw new AppError(`Role '${normalizedName}' already exists`, 409);
        }
      }

      data.name = normalizedName;
    }

    if (payload.description !== undefined) {
      data.description = payload.description;
    }

    const updatedRole = await this.prisma.role.update({
      where: { id: roleId },
      data,
    });

    await permissionCache.invalidateAll();

    return updatedRole;
  }

  async deleteRole(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      throw new AppError('Role not found', 404);
    }

    if (SYSTEM_ROLES.includes(role.name as any)) {
      throw new AppError(`Cannot delete system role '${role.name}'`, 400);
    }

    if (role._count.users > 0) {
      throw new AppError(
        `Cannot delete role '${role.name}' because it is assigned to ${role._count.users} user(s). Reassign them first.`,
        400,
      );
    }

    await this.prisma.role.delete({
      where: { id: roleId },
    });

    await permissionCache.invalidateAll();
  }

  async assignPermissionsToRole(roleId: string, permissionIds: string[]) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new AppError('Role not found', 404);
    }

    // Verify all permission IDs exist
    if (permissionIds.length > 0) {
      const uniquePermissionIds = Array.from(new Set(permissionIds));
      const validPermissionsCount = await this.prisma.permission.count({
        where: { id: { in: uniquePermissionIds } },
      });

      if (validPermissionsCount !== uniquePermissionIds.length) {
        throw new AppError('One or more permission IDs are invalid', 400);
      }

      // Sync role permissions in transaction (replace all existing with new list)
      await this.prisma.$transaction([
        this.prisma.rolePermission.deleteMany({
          where: { roleId },
        }),
        this.prisma.rolePermission.createMany({
          data: uniquePermissionIds.map((permissionId) => ({
            roleId,
            permissionId,
          })),
        }),
      ]);
    } else {
      // Clear permissions for this role
      await this.prisma.rolePermission.deleteMany({
        where: { roleId },
      });
    }

    // Invalidate all cached permissions across Redis so all users with this role get updated immediately
    await permissionCache.invalidateAll();

    return this.getRoleById(roleId);
  }

  async removePermissionsFromRole(roleId: string, permissionIds: string[]) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new AppError('Role not found', 404);
    }

    await this.prisma.rolePermission.deleteMany({
      where: {
        roleId,
        permissionId: { in: permissionIds },
      },
    });

    await permissionCache.invalidateAll();

    return this.getRoleById(roleId);
  }

  // ==========================================
  // PERMISSION MANAGEMENT
  // ==========================================

  async getAllPermissions() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });

    return permissions;
  }

  async createPermission(payload: ZCTPermission) {
    const resource = payload.resource.trim().toLowerCase();
    const action = payload.action.trim().toLowerCase();

    const existingPermission = await this.prisma.permission.findUnique({
      where: {
        resource_action: {
          resource,
          action,
        },
      },
    });

    if (existingPermission) {
      throw new AppError(
        `Permission '${resource}:${action}' already exists`,
        409,
      );
    }

    const permission = await this.prisma.permission.create({
      data: {
        resource,
        action,
        description: payload.description,
      },
    });

    return permission;
  }

  async deletePermission(permissionId: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id: permissionId },
    });

    if (!permission) {
      throw new AppError('Permission not found', 404);
    }

    await this.prisma.permission.delete({
      where: { id: permissionId },
    });

    await permissionCache.invalidateAll();
  }
}
