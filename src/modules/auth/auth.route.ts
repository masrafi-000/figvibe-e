import { Router } from 'express';
import passport from 'passport';
import { authenticate } from '../../middleware/auth.middleware';
import { authRateLimiter } from '../../middleware/rate_limiter.middleware';
import type { AuthController } from './auth.controller';

export class AuthRouter {
  public readonly router: Router;

  constructor(private readonly controller: AuthController) {
    this.router = Router();

    this.initializeRouter();
  }

  private initializeRouter(): void {
    // Local registration & login
    this.router.post('/register', authRateLimiter, this.controller.register);
    this.router.post('/login', authRateLimiter, this.controller.login);

    // Google OAuth
    this.router.get(
      '/google',
      passport.authenticate('google', {
        scope: ['profile', 'email'],
        session: false,
      }),
    );

    this.router.get(
      '/google/callback',
      passport.authenticate('google', {
        session: false,
        failureRedirect: '/login?error=oauth_failed',
      }),
      this.controller.googleCallback,
    );

    // Refresh token & logout
    this.router.post('/refresh', this.controller.refresh);
    this.router.post('/logout', this.controller.logout);

    // Current user profile & bearer token
    this.router.get('/me', authenticate, this.controller.me);
    this.router.get('/token', authenticate, this.controller.getToken);
  }
}
