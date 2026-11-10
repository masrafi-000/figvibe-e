import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import type { CartController } from './cart.controller';

export class CartRouter {
  public readonly router: Router;

  constructor(private readonly controller: CartController) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // All cart operations require user authentication
    this.router.use(authenticate);

    // Get current authenticated user's cart
    this.router.get('/', this.controller.getCart);

    // Clear all items from the cart
    this.router.delete('/', this.controller.clearCart);

    // Add an item to the cart
    this.router.post('/items', this.controller.addToCart);

    // Update quantity of an existing cart item
    this.router.patch('/items/:itemId', this.controller.updateCartItem);

    // Remove a single item from the cart
    this.router.delete('/items/:itemId', this.controller.removeCartItem);
  }
}
