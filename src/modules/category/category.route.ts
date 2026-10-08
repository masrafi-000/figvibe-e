import { Router } from 'express';
import type { CategoryController } from './category.controller';
import { authenticate, requireRole } from '../../middleware/auth.middleware';

export class CategoryRouter {
  public readonly router: Router;

  constructor(private readonly controller: CategoryController) {
    this.router = Router();

    this.initializeRouter();
  }

  private initializeRouter(): void {
    // Public routes
    this.router.get('/', this.controller.getAllCategories);
    this.router.get('/tree', this.controller.getCategoryTree);
    this.router.get('/:id', this.controller.getCategoryById);

    // Protected routes (Admin & Super Admin only)
    this.router.post(
      '/',
      authenticate,
      requireRole('ADMIN', 'SUPER_ADMIN'),
      this.controller.createCategory,
    );
    this.router.patch(
      '/:id',
      authenticate,
      requireRole('ADMIN', 'SUPER_ADMIN'),
      this.controller.updateCategory,
    );
    this.router.delete(
      '/:id',
      authenticate,
      requireRole('ADMIN', 'SUPER_ADMIN'),
      this.controller.deleteCategory,
    );
  }
}
