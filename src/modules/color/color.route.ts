import { Router } from 'express';
import type { ColorController } from './color.controller';
import { authenticate, requireRole } from '../../middleware/auth.middleware';

export class ColorRouter {
  public readonly router: Router;

  constructor(private readonly colorController: ColorController) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Public Read Routes
    this.router.get('/', this.colorController.getAllColors);
    this.router.get('/:id', this.colorController.getColorById);

    // Protected Write Routes (Admin & Super Admin only)
    this.router.post(
      '/',
      authenticate,
      requireRole('ADMIN', 'SUPER_ADMIN'),
      this.colorController.createColor,
    );
    this.router.patch(
      '/:id',
      authenticate,
      requireRole('ADMIN', 'SUPER_ADMIN'),
      this.colorController.updateColor,
    );
    this.router.delete(
      '/:id',
      authenticate,
      requireRole('ADMIN', 'SUPER_ADMIN'),
      this.colorController.deleteColor,
    );
  }
}
