import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import type { PosController } from './pos.controller';

export class PosRouter {
  public readonly router: Router;

  constructor(private readonly controller: PosController) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // All POS operations require authentication
    this.router.use(authenticate);

    // ==========================================
    // Salesman & Staff In-Store Operations
    // ==========================================
    this.router.post(
      '/orders',
      requireRole('SALESMAN', 'ADMIN', 'SUPER_ADMIN'),
      this.controller.createPosOrder,
    );

    this.router.get(
      '/my-sales',
      requireRole('SALESMAN', 'ADMIN', 'SUPER_ADMIN'),
      this.controller.getMySales,
    );

    this.router.get(
      '/my-summary',
      requireRole('SALESMAN', 'ADMIN', 'SUPER_ADMIN'),
      this.controller.getMySummary,
    );

    this.router.patch(
      '/orders/:id/deliver',
      requireRole('SALESMAN', 'ADMIN', 'SUPER_ADMIN'),
      this.controller.processDelivery,
    );

    this.router.post(
      '/orders/:id/invoice',
      requireRole('SALESMAN', 'ADMIN', 'SUPER_ADMIN'),
      this.controller.sendInvoiceEmail,
    );

    // ==========================================
    // Admin & Super Admin Monitoring & Reports
    // ==========================================
    this.router.get(
      '/sales',
      requireRole('ADMIN', 'SUPER_ADMIN'),
      this.controller.getAllPosSales,
    );

    this.router.get(
      '/performance',
      requireRole('ADMIN', 'SUPER_ADMIN'),
      this.controller.getSalesmenPerformance,
    );

    this.router.get(
      '/reports/variant-sales',
      requireRole('ADMIN', 'SUPER_ADMIN'),
      this.controller.getVariantSalesReport,
    );
  }
}

