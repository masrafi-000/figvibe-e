import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../common/utils/AppError';
import {
  ACCESS_COOKIE_NAME,
  verifyAccessToken,
  type TokenPayload,
} from '../common/utils/jwt';

declare global {
  namespace Express {
    interface User extends Partial<TokenPayload> {
      id?: string;
      userId?: string;
      email?: string;
      role?: string;
    }
  }
}

export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  try {
    let token: string | undefined = req.cookies?.[ACCESS_COOKIE_NAME];

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError('Authentication required. Please log in.', 401);
    }

    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(new AppError('Invalid or expired authentication token', 401));
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.role) {
      next(new AppError('Authentication required', 401));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(
        new AppError('You do not have permission to access this resource', 403),
      );
      return;
    }

    next();
  };
};
