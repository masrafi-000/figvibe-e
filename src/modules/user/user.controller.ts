import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../common/utils/AppError';
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
  constructor(private readonly userService: UserService) {}

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

      res.status(200).json({
        success: true,
        message: 'Permission deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}
