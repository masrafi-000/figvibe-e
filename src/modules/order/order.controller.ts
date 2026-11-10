import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../common/utils/AppError';
import type { AuditService } from '../audit/audit.service';
import {
  ZCICancelOrder,
  ZCICreateAddress,
  ZCICreateOrder,
  ZCIOrderQuery,
  ZCIUpdateOrderStatus,
} from './order.schema';
import type { OrderService } from './order.service';

export class OrderController {
  constructor(
    private readonly orderService: OrderService,
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
   * Place a new order (Checkout)
   */
  createOrder = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const payload = ZCICreateOrder.parse(req.body);

      const order = await this.orderService.createOrder(userId, payload);

      void this.auditService.log({
        req,
        action: 'CREATE',
        status: 'SUCCESS',
        resource: 'Order',
        resourceId: order.id,
        description: `Order ${order.orderNumber} placed (Total: ${order.total.toNumber()} BDT)`,
        oldValues: null,
        newValues: {
          orderNumber: order.orderNumber,
          total: order.total.toNumber(),
          itemCount: order.items.length,
          paymentMethod: order.payment?.method,
        },
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

      res.status(201).json({
        success: true,
        message: 'Order placed successfully',
        data: { order },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get orders of the currently authenticated user
   */
  getMyOrders = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const query = ZCIOrderQuery.parse(req.query);

      const result = await this.orderService.getUserOrders(userId, query);

      res.status(200).json({
        success: true,
        meta: result.meta,
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all orders across the system (Admin & Staff)
   */
  getAllOrders = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = ZCIOrderQuery.parse(req.query);
      const result = await this.orderService.getAllOrders(query);

      res.status(200).json({
        success: true,
        meta: result.meta,
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get a single order by ID or orderNumber
   */
  getOrderById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) {
        throw new AppError('Order ID or order number is required', 400);
      }

      const userId = this.getUserId(req);
      const role = req.user?.role || '';
      const isAdminOrStaff = ['ADMIN', 'SUPER_ADMIN', 'SALESMAN'].includes(
        role,
      );

      const order = await this.orderService.getOrderById(
        id,
        userId,
        isAdminOrStaff,
      );

      res.status(200).json({
        success: true,
        data: { order },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update order status (Admin & Staff)
   */
  updateOrderStatus = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) {
        throw new AppError('Order ID is required', 400);
      }

      const userId = this.getUserId(req);
      const payload = ZCIUpdateOrderStatus.parse(req.body);

      const order = await this.orderService.updateOrderStatus(
        id,
        payload,
        userId,
      );

      void this.auditService.log({
        req,
        action: 'STATUS_CHANGE',
        status: 'SUCCESS',
        resource: 'Order',
        resourceId: order.id,
        description: `Order ${order.orderNumber} status changed to ${payload.status}`,
        oldValues: null,
        newValues: { status: payload.status, notes: payload.notes },
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
        message: 'Order status updated successfully',
        data: { order },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Cancel an order (Customer if PENDING, or Admin)
   */
  cancelOrder = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) {
        throw new AppError('Order ID is required', 400);
      }

      const userId = this.getUserId(req);
      const role = req.user?.role || '';
      const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(role);
      const payload = ZCICancelOrder.parse(req.body);

      const order = await this.orderService.cancelOrder(
        id,
        userId,
        isAdmin,
        payload.reason,
      );

      void this.auditService.log({
        req,
        action: 'UPDATE',
        status: 'SUCCESS',
        resource: 'Order',
        resourceId: order.id,
        description: `Order ${order.orderNumber} cancelled. Reason: ${payload.reason}`,
        oldValues: null,
        newValues: { status: 'CANCELLED', reason: payload.reason },
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
        message: 'Order cancelled successfully',
        data: { order },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user's saved shipping addresses
   */
  getMyAddresses = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const addresses = await this.orderService.getUserAddresses(userId);

      res.status(200).json({
        success: true,
        data: { addresses },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Save a new shipping address
   */
  createAddress = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const payload = ZCICreateAddress.parse(req.body);

      const address = await this.orderService.createAddress(userId, payload);

      res.status(201).json({
        success: true,
        message: 'Shipping address created successfully',
        data: { address },
      });
    } catch (error) {
      next(error);
    }
  };
}
