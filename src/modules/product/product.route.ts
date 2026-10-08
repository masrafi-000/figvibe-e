import { Router } from 'express';
import type { ProductController } from './product.controller';
import { authenticate, requireRole } from '../../middleware/auth.middleware';

export class ProductRouter {
  public readonly router: Router;

  constructor(private readonly productController: ProductController) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Public Product Read Routes
    this.router.get('/', this.productController.getAllProducts);
    this.router.get('/slug/:slug', this.productController.getProductBySlug);
    this.router.get('/:id', this.productController.getProductById);

    // Protected Product Write Routes
    this.router.post(
      '/',
      authenticate,
      requireRole('ADMIN', 'SUPER_ADMIN'),
      this.productController.createProduct,
    );

    this.router.patch(
      '/:id',
      authenticate,
      requireRole('ADMIN', 'SUPER_ADMIN'),
      this.productController.updateProduct,
    );

    this.router.delete(
      '/:id',
      authenticate,
      requireRole('ADMIN', 'SUPER_ADMIN'),
      this.productController.deleteProduct,
    );

    // Variant Direct Management Routes
    this.router.post(
      '/:id/variants',
      authenticate,
      requireRole('ADMIN', 'SUPER_ADMIN'),
      this.productController.createVariant,
    );

    this.router.patch(
      '/variants/:variantId',
      authenticate,
      requireRole('ADMIN', 'SUPER_ADMIN'),
      this.productController.updateVariant,
    );

    this.router.delete(
      '/variants/:variantId',
      authenticate,
      requireRole('ADMIN', 'SUPER_ADMIN'),
      this.productController.deleteVariant,
    );
  }
}
