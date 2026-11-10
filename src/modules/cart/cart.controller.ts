import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../common/utils/AppError';
import type { AuditService } from '../audit/audit.service';
import { ZCIAddToCart, ZCIUpdateCartItem } from './cart.schema';
import type { CartService } from './cart.service';

export class CartController {
  constructor(
    private readonly cartService: CartService,
    private readonly auditService: AuditService,
  ) {}

  private getUserId(req: Request): string {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      throw new AppError('Authentication required', 401);
    }
    return userId;
  }

  /**
   * Get authenticated user's cart
   */
  getCart = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const cart = await this.cartService.getCart(userId);

      res.status(200).json({
        success: true,
        data: { cart },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Add a product variant to the cart
   */
  addToCart = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const payload = ZCIAddToCart.parse(req.body);

      const cart = await this.cartService.addToCart(userId, payload);

      void this.auditService.log({
        req,
        action: 'UPDATE',
        status: 'SUCCESS',
        resource: 'Cart',
        resourceId: cart.id,
        description: `Added variant ${payload.variantId} (qty: ${payload.quantity}) to cart`,
        oldValues: null,
        newValues: { variantId: payload.variantId, quantity: payload.quantity },
        actorType: 'USER',
        actorId: userId,
        actorEmail: req.user?.email || null,
        ipAddress:
          (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
          req.ip ||
          null,
        userAgent: req.get('user-agent') || null,
        requestId: (req.headers['x-request-id'] as string) || null,
      });

      res.status(200).json({
        success: true,
        message: 'Item added to cart successfully',
        data: { cart },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update quantity of a specific cart item
   */
  updateCartItem = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const itemId = req.params.itemId as string;
      if (!itemId) {
        throw new AppError('Cart item ID is required', 400);
      }

      const payload = ZCIUpdateCartItem.parse(req.body);
      const cart = await this.cartService.updateCartItem(
        userId,
        itemId,
        payload.quantity,
      );

      res.status(200).json({
        success: true,
        message: 'Cart item updated successfully',
        data: { cart },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Remove a single item from the cart
   */
  removeCartItem = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const itemId = req.params.itemId as string;
      if (!itemId) {
        throw new AppError('Cart item ID is required', 400);
      }

      const cart = await this.cartService.removeCartItem(userId, itemId);

      res.status(200).json({
        success: true,
        message: 'Item removed from cart successfully',
        data: { cart },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Clear all items from the cart
   */
  clearCart = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const cart = await this.cartService.clearCart(userId);

      res.status(200).json({
        success: true,
        message: 'Cart cleared successfully',
        data: { cart },
      });
    } catch (error) {
      next(error);
    }
  };
}
