import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../common/utils/AppError';
import type { AuditService } from '../audit/audit.service';
import {
  ZCIAssignRolePermissions,
  ZCIAssignUserRole,
  ZCIPermission,
  ZCIUpdateUserRole,
  ZCIUserQuery,
  ZCIUserRole,
} from './user.schema';
import type { UserService } from './user.service';

export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly auditService: AuditService,
  ) {}

  // ==========================================
  // USER HANDLERS
  // ==========================================

  getAllUsers = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = ZCIUserQuery.parse(req.query);
      const result = await this.userService.getAllUsers(query);

      res.status(200).json({
        success: true,
        meta: result.meta,
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  };

  getUserById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('User ID is required', 400);

      const user = await this.userService.getUserById(id);

      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  };

  suspendUser = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('User ID is required', 400);

      const user = await this.userService.suspendUser(id);

      void this.auditService.log({
        req,
        action: 'STATUS_CHANGE',
        resource: 'User',
        resourceId: id,
        description: `User ${user.email} account suspended`,
        newValues: { status: 'SUSPENDED' },
      });

      res.status(200).json({
        success: true,
        message: 'User account suspended successfully',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  };

  unsuspendUser = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('User ID is required', 400);

      const user = await this.userService.unsuspendUser(id);

      void this.auditService.log({
        req,
        action: 'STATUS_CHANGE',
        resource: 'User',
        resourceId: id,
        description: `User ${user.email} account reactivated`,
        newValues: { status: 'ACTIVE' },
      });

      res.status(200).json({
        success: true,
        message: 'User account reactivated successfully',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  };

  softDeleteUser = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('User ID is required', 400);

      const user = await this.userService.softDeleteUser(id);

      void this.auditService.log({
        req,
        action: 'STATUS_CHANGE',
        resource: 'User',
        resourceId: id,
        description: `User ${user.email} account soft-deleted`,
        newValues: { status: 'DELETED' },
      });

      res.status(200).json({
        success: true,
        message: 'User soft-deleted successfully',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  };

  deleteUserPermanently = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('User ID is required', 400);

      await this.userService.deleteUserPermanently(id);

      void this.auditService.log({
        req,
        action: 'DELETE',
        resource: 'User',
        resourceId: id,
        description: `User ${id} permanently deleted`,
      });

      res.status(200).json({
        success: true,
        message: 'User deleted permanently',
      });
    } catch (error) {
      next(error);
    }
  };

  assignRoleToUser = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('User ID is required', 400);

      const { roleId } = ZCIAssignUserRole.parse(req.body);
      const user = await this.userService.assignRoleToUser(id, roleId);

      void this.auditService.log({
        req,
        action: 'ROLE_CHANGE',
        resource: 'User',
        resourceId: id,
        description: `Role assigned to user ${user.email}`,
        newValues: { roleId, roleName: user.role?.name },
      });

      res.status(200).json({
        success: true,
        message: 'Role assigned to user successfully',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  };

  resetUserRoleToDefault = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('User ID is required', 400);

      const user = await this.userService.resetUserRoleToDefault(id);

      void this.auditService.log({
        req,
        action: 'ROLE_CHANGE',
        resource: 'User',
        resourceId: id,
        description: `Role reset to default CUSTOMER for user ${user.email}`,
        newValues: { roleId: user.roleId },
      });

      res.status(200).json({
        success: true,
        message: 'User role reset to default CUSTOMER role',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  };

  revokeAllUserSessions = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('User ID is required', 400);

      const result = await this.userService.revokeAllUserSessions(id);

      void this.auditService.log({
        req,
        action: 'LOGOUT',
        resource: 'UserSession',
        resourceId: id,
        description: `All active sessions revoked for user ${id}`,
        metadata: { revokedCount: result.revokedCount },
      });

      res.status(200).json({
        success: true,
        message: result.message,
        data: { revokedCount: result.revokedCount },
      });
    } catch (error) {
      next(error);
    }
  };

  // ==========================================
  // ROLE HANDLERS
  // ==========================================

  getAllRoles = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const roles = await this.userService.getAllRoles();

      res.status(200).json({
        success: true,
        data: { roles },
      });
    } catch (error) {
      next(error);
    }
  };

  getRoleById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('Role ID is required', 400);

      const role = await this.userService.getRoleById(id);

      res.status(200).json({
        success: true,
        data: { role },
      });
    } catch (error) {
      next(error);
    }
  };

  createRole = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const payload = ZCIUserRole.parse(req.body);
      const role = await this.userService.createRole(payload);

      void this.auditService.log({
        req,
        action: 'CREATE',
        resource: 'Role',
        resourceId: role.id,
        description: `Role created: ${role.name}`,
        newValues: role,
      });

      res.status(201).json({
        success: true,
        message: 'Role created successfully',
        data: { role },
      });
    } catch (error) {
      next(error);
    }
  };

  updateRole = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('Role ID is required', 400);

      const payload = ZCIUpdateUserRole.parse(req.body);
      const role = await this.userService.updateRole(id, payload);

      void this.auditService.log({
        req,
        action: 'UPDATE',
        resource: 'Role',
        resourceId: id,
        description: `Role updated: ${role.name}`,
        newValues: payload,
      });

      res.status(200).json({
        success: true,
        message: 'Role updated successfully',
        data: { role },
      });
    } catch (error) {
      next(error);
    }
  };

  deleteRole = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('Role ID is required', 400);

      await this.userService.deleteRole(id);

      void this.auditService.log({
        req,
        action: 'DELETE',
        resource: 'Role',
        resourceId: id,
        description: `Role deleted with ID: ${id}`,
      });

      res.status(200).json({
        success: true,
        message: 'Role deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  assignPermissionsToRole = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('Role ID is required', 400);

      const { permissionIds } = ZCIAssignRolePermissions.parse(req.body);
      const role = await this.userService.assignPermissionsToRole(
        id,
        permissionIds,
      );

      void this.auditService.log({
        req,
        action: 'UPDATE',
        resource: 'RolePermission',
        resourceId: id,
        description: `Assigned ${permissionIds.length} permissions to role ${role.name}`,
        newValues: { permissionIds },
      });

      res.status(200).json({
        success: true,
        message: 'Permissions assigned to role successfully',
        data: { role },
      });
    } catch (error) {
      next(error);
    }
  };

  removePermissionsFromRole = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('Role ID is required', 400);

      const { permissionIds } = ZCIAssignRolePermissions.parse(req.body);
      const role = await this.userService.removePermissionsFromRole(
        id,
        permissionIds,
      );

      void this.auditService.log({
        req,
        action: 'UPDATE',
        resource: 'RolePermission',
        resourceId: id,
        description: `Removed ${permissionIds.length} permissions from role ${role.name}`,
        newValues: { permissionIds },
      });

      res.status(200).json({
        success: true,
        message: 'Permissions removed from role successfully',
        data: { role },
      });
    } catch (error) {
      next(error);
    }
  };

  // ==========================================
  // PERMISSION HANDLERS
  // ==========================================

  getAllPermissions = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const permissions = await this.userService.getAllPermissions();

      res.status(200).json({
        success: true,
        data: { permissions },
      });
    } catch (error) {
      next(error);
    }
  };

  createPermission = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const payload = ZCIPermission.parse(req.body);
      const permission = await this.userService.createPermission(payload);

      void this.auditService.log({
        req,
        action: 'CREATE',
        resource: 'Permission',
        resourceId: permission.id,
        description: `Permission created: ${permission.resource}:${permission.action}`,
        newValues: permission,
      });

      res.status(201).json({
        success: true,
        message: 'Permission created successfully',
        data: { permission },
      });
    } catch (error) {
      next(error);
    }
  };

  deletePermission = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('Permission ID is required', 400);

      await this.userService.deletePermission(id);

      void this.auditService.log({
        req,
        action: 'DELETE',
        resource: 'Permission',
        resourceId: id,
        description: `Permission deleted with ID: ${id}`,
      });

      res.status(200).json({
        success: true,
        message: 'Permission deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}
