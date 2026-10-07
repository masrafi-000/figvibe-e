import { Router } from 'express';
import type { BrandController } from './brand.controller';
import { authenticate, requireRole } from '../../middleware/auth.middleware';

export class BrandRouter {
  public readonly router: Router;

  constructor(private readonly brandController: BrandController) {
    this.router = Router();

    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Public Read Routes
    this.router.get('/', this.brandController.getAllBrands);
    this.router.get('/:id', this.brandController.getBrandById);

    // Protected Write Routes (Admin & Super Admin only)
    this.router.post(
      '/',
      authenticate,
      requireRole('ADMIN', 'SUPER_ADMIN'),
      this.brandController.createBrand,
    );
    this.router.patch(
      '/:id',
      authenticate,
      requireRole('ADMIN', 'SUPER_ADMIN'),
      this.brandController.updateBrand,
    );
    this.router.delete(
      '/:id',
      authenticate,
      requireRole('ADMIN', 'SUPER_ADMIN'),
      this.brandController.deleteBrand,
    );
  }
}
