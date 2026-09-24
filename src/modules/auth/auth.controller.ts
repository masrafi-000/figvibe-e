import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../common/utils/AppError';
import {
  clearAuthCookies,
  REFRESH_COOKIE_NAME,
  setAuthCookies,
} from '../../common/utils/jwt';
import { env } from '../../config/env';
import { ZCILogin, ZCIRegister } from './auth.schema';
import type { AuthService } from './auth.service';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const parsedBody = ZCIRegister.parse(req.body);
      const result = await this.authService.register(parsedBody, {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });

      setAuthCookies(res, result.accessToken, result.refreshToken);

      res.status(201).json({
        success: true,
        message: 'Account registered successfully',
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          tokenType: 'Bearer',
        },
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const parsedBody = ZCILogin.parse(req.body);
      const result = await this.authService.login(parsedBody, {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });

      setAuthCookies(res, result.accessToken, result.refreshToken);

      res.status(200).json({
        success: true,
        message: 'Logged in successfully',
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          tokenType: 'Bearer',
        },
      });
    } catch (error) {
      next(error);
    }
  };

  googleCallback = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = req.user as { id?: string; userId?: string } | undefined;
      const userId = user?.id || user?.userId;
      if (!userId) {
        throw new AppError('Google authentication failed', 401);
      }

      const result = await this.authService.handleOAuthLogin(userId, {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });

      setAuthCookies(res, result.accessToken, result.refreshToken);

      res.redirect(env.FRONTEND_URL);
    } catch (error) {
      next(error);
    }
  };

  refresh = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const refreshToken =
        req.cookies?.[REFRESH_COOKIE_NAME] ||
        (req.body?.refreshToken as string | undefined);

      if (!refreshToken) {
        throw new AppError(
          'Refresh token not provided in cookies or request body',
          401,
        );
      }

      const result = await this.authService.refreshTokens(refreshToken, {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });

      setAuthCookies(res, result.accessToken, result.refreshToken);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          tokenType: 'Bearer',
        },
      });
    } catch (error) {
      next(error);
    }
  };

  logout = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const refreshToken =
        req.cookies?.[REFRESH_COOKIE_NAME] ||
        (req.body?.refreshToken as string | undefined);

      await this.authService.logout(refreshToken);

      clearAuthCookies(res);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  me = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        throw new AppError('Authentication required', 401);
      }

      const user = await this.authService.getCurrentUser(userId);

      res.status(200).json({
        success: true,
        data: {
          user,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getToken = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        throw new AppError('Authentication required', 401);
      }

      const result = await this.authService.generateTokenForUser(userId);
      setAuthCookies(res, result.accessToken, result.refreshToken);

      res.status(200).json({
        success: true,
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          tokenType: result.tokenType,
          user: result.user,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
