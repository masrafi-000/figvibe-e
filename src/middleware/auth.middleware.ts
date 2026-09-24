import type { NextFunction, Request, Response } from 'express';
import { permissionCache } from '../common/services/permission.cache';
import { AppError } from '../common/utils/AppError';
import { ACCESS_COOKIE_NAME, verifyAccessToken } from '../common/utils/jwt';

/**
 * Extend Express request user type
 */
declare global {
  namespace Express {
    interface User {
      id: string;
      userId?: string;
      email?: string;
      role?: string;
      permissions?: Set<string>;
      [key: string]: any;
    }
  }
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    let token = req.cookies?.[ACCESS_COOKIE_NAME] as string | undefined;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.slice('Bearer '.length);
    }

    if (!token) {
      throw new AppError('Authentication required. Please log in.', 401);
    }

    // Verify JWT
    const payload = verifyAccessToken(token);

    // Load user's permissions
    const permissions = await permissionCache.getUserPermissions(
      payload.userId,
    );

    req.user = {
      id: payload.userId,
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      permissions,
    };

    next();
  } catch (error) {
    /**
     * Preserve application-level authentication errors.
     */
    if (error instanceof AppError) {
      next(error);
      return;
    }

    next(new AppError('Invalid or expired authentication token', 401));
  }
};

export const requirePermission = (resource: string, action: string) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Authentication must happen before authorization
    if (!req.user || !req.user.permissions) {
      next(new AppError('Authentication required', 401));
      return;
    }

    // Bind permission identifires
    const targetPermission = `${resource}:${action}`;
    const resourceWildcard = `${resource}:*`;

    const permissions = req.user.permissions;

    const hasPermission =
      permissions.has(targetPermission) ||
      permissions.has(resourceWildcard) ||
      permissions.has('*');

    if (!hasPermission) {
      next(
        new AppError(
          `Forbidden: You do not have permission to perform '${action}' on '${resource}'`,
          403,
        ),
      );
      return;
    }
    next();
  };
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Authentication check
    if (!req.user || !req.user.role) {
      next(new AppError('Authentication required', 401));
      return;
    }

    // SUPER_ADMIN has global role access
    if (req.user.role === 'SUPER_ADMIN') {
      next();
      return;
    }

    if (roles.includes(req.user.role)) {
      next();
      return;
    }

    next(new AppError('Forbidden: Insufficient role permissions', 403));
  };
};

export const authorize = requireRole;
