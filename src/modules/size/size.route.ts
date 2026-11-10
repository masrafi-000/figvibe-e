import { Router } from 'express';
import type { SizeController } from './size.controller';
import { authenticate, requireRole } from '../../middleware/auth.middleware';

export class SizeRouter {
  public readonly router: Router;

  constructor(private readonly sizeController: SizeController) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Public Read Routes
    this.router.get('/', this.sizeController.getAllSizes);
    this.router.get('/:id', this.sizeController.getSizeById);

    // Protected Write Routes (Admin & Super Admin only)
    this.router.post(
      '/',
      authenticate,
      requireRole('ADMIN', 'SUPER_ADMIN'),
      this.sizeController.createSize,
    );
    this.router.patch(
      '/:id',
      authenticate,
      requireRole('ADMIN', 'SUPER_ADMIN'),
      this.sizeController.updateSize,
    );
    this.router.delete(
      '/:id',
      authenticate,
      requireRole('ADMIN', 'SUPER_ADMIN'),
      this.sizeController.deleteSize,
    );
  }
}
