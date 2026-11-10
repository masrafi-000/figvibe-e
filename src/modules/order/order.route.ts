import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import type { OrderController } from './order.controller';

export class OrderRouter {
  public readonly router: Router;

  constructor(private readonly controller: OrderController) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // All order operations require authentication
    this.router.use(authenticate);

    // Customer Address endpoints
    this.router.get('/addresses', this.controller.getMyAddresses);
    this.router.post('/addresses', this.controller.createAddress);

    // Customer personal orders
    this.router.get('/my-orders', this.controller.getMyOrders);

    // Place new order
    this.router.post('/', this.controller.createOrder);

    // Admin / Staff: View all orders across users
    this.router.get(
      '/',
      requireRole('ADMIN', 'SUPER_ADMIN', 'SALESMAN'),
      this.controller.getAllOrders,
    );

    // Single order operations
    this.router.get('/:id', this.controller.getOrderById);

    // Admin / Staff: Update status
    this.router.patch(
      '/:id/status',
      requireRole('ADMIN', 'SUPER_ADMIN', 'SALESMAN'),
      this.controller.updateOrderStatus,
    );

    // Cancel order (Customer if PENDING, or Admin)
    this.router.post('/:id/cancel', this.controller.cancelOrder);
  }
}
