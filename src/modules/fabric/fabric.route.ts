import { Router } from 'express';
import type { FabricController } from './fabric.controller';
import { authenticate, requireRole } from '../../middleware/auth.middleware';

export class FabricRouter {
  public readonly router: Router;

  constructor(private readonly fabricController: FabricController) {
    this.router = Router();

    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Public Read Routes
    this.router.get('/', this.fabricController.getAllFabrics);
    this.router.get('/:id', this.fabricController.getFabricById);

    // Protected Write Routes (Admin & Super Admin only)
    this.router.post(
      '/',
      authenticate,
      requireRole('ADMIN', 'SUPER_ADMIN'),
      this.fabricController.createFabric,
    );
    this.router.patch(
      '/:id',
      authenticate,
      requireRole('ADMIN', 'SUPER_ADMIN'),
      this.fabricController.updateFabric,
    );
    this.router.delete(
      '/:id',
      authenticate,
      requireRole('ADMIN', 'SUPER_ADMIN'),
      this.fabricController.deleteFabric,
    );
  }
}
