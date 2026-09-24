import { Router } from 'express';
import {
  authenticate,
  requirePermission,
} from '../../middleware/auth.middleware';
import type { UserController } from './user.controller';

export class UserRouter {
  public readonly router: Router;

  constructor(private readonly controller: UserController) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // All endpoints in this router require authentication
    this.router.use(authenticate);

    // Role Routes (Must be declared before /:id)
    this.router.get(
      '/roles',
      requirePermission('role', 'read'),
      this.controller.getAllRoles,
    );
    this.router.get(
      '/roles/:id',
      requirePermission('role', 'read'),
      this.controller.getRoleById,
    );
    this.router.post(
      '/roles',
      requirePermission('role', 'update'),
      this.controller.createRole,
    );
    this.router.patch(
      '/roles/:id',
      requirePermission('role', 'update'),
      this.controller.updateRole,
    );
    this.router.delete(
      '/roles/:id',
      requirePermission('role', 'update'),
      this.controller.deleteRole,
    );
    this.router.put(
      '/roles/:id/permissions',
      requirePermission('role', 'update'),
      this.controller.assignPermissionsToRole,
    );
    this.router.delete(
      '/roles/:id/permissions',
      requirePermission('role', 'update'),
      this.controller.removePermissionsFromRole,
    );

    // Permission Routes (Must be declared before /:id)
    this.router.get(
      '/permissions',
      requirePermission('role', 'read'),
      this.controller.getAllPermissions,
    );
    this.router.post(
      '/permissions',
      requirePermission('role', 'update'),
      this.controller.createPermission,
    );
    this.router.delete(
      '/permissions/:id',
      requirePermission('role', 'update'),
      this.controller.deletePermission,
    );

    // User Routes
    this.router.get(
      '/',
      requirePermission('user', 'read'),
      this.controller.getAllUsers,
    );
    this.router.get(
      '/:id',
      requirePermission('user', 'read'),
      this.controller.getUserById,
    );
    this.router.patch(
      '/:id/suspend',
      requirePermission('user', 'update'),
      this.controller.suspendUser,
    );
    this.router.patch(
      '/:id/unsuspend',
      requirePermission('user', 'update'),
      this.controller.unsuspendUser,
    );
    this.router.delete(
      '/:id/soft',
      requirePermission('user', 'delete'),
      this.controller.softDeleteUser,
    );
    this.router.delete(
      '/:id',
      requirePermission('user', 'delete'),
      this.controller.deleteUserPermanently,
    );
    this.router.patch(
      '/:id/role',
      requirePermission('user', 'update'),
      this.controller.assignRoleToUser,
    );
    this.router.patch(
      '/:id/reset-role',
      requirePermission('user', 'update'),
      this.controller.resetUserRoleToDefault,
    );
    this.router.post(
      '/:id/revoke-sessions',
      requirePermission('user', 'update'),
      this.controller.revokeAllUserSessions,
    );
  }
}
