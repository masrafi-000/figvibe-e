import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../common/utils/AppError';
import type { AuditService } from '../audit/audit.service';
import {
  ZCIPosCreateOrder,
  ZCIPosDeliveryUpdate,
  ZCIPosPerformanceQuery,
  ZCIPosSalesQuery,
  ZCISendInvoice,
} from './pos.schema';
import type { PosService } from './pos.service';

export class PosController {
  constructor(
    private readonly posService: PosService,
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
   * Create in-store physical POS order
   */
  createPosOrder = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const salesmanId = this.getUserId(req);
      const payload = ZCIPosCreateOrder.parse(req.body);

      const order = await this.posService.createPosOrder(salesmanId, payload);

      void this.auditService.log({
        req,
        action: 'CREATE',
        status: 'SUCCESS',
        resource: 'POS_Order',
        resourceId: order.id,
        description: `POS Order ${order.orderNumber} placed by salesman ${salesmanId} (Total: ${order.total.toString()} BDT)`,
        oldValues: null,
        newValues: {
          orderNumber: order.orderNumber,
          channel: 'POS',
          total: order.total.toNumber(),
          paymentMethod: order.payment?.method,
          deliveryType: order.deliveryType,
          salesmanId,
        },
        actorType: 'USER',
        actorId: salesmanId,
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
        message: 'In-store order created successfully',
        data: { order },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update delivery / handover status of an in-store order
   */
  processDelivery = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const orderId = req.params.id as string;
      if (!orderId) {
        throw new AppError('Order ID is required', 400);
      }

      const salesmanId = this.getUserId(req);
      const payload = ZCIPosDeliveryUpdate.parse(req.body);

      const order = await this.posService.processDelivery(
        orderId,
        salesmanId,
        payload,
      );

      void this.auditService.log({
        req,
        action: 'STATUS_CHANGE',
        status: 'SUCCESS',
        resource: 'POS_Order',
        resourceId: order.id,
        description: `POS Order ${order.orderNumber} delivery updated to ${payload.status}`,
        oldValues: null,
        newValues: { status: payload.status, notes: payload.notes },
        actorType: 'USER',
        actorId: salesmanId,
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
        message: 'Order delivery status updated successfully',
        data: { order },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Send / Resend Invoice Email to customer
   */
  sendInvoiceEmail = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const orderId = req.params.id as string;
      if (!orderId) {
        throw new AppError('Order ID is required', 400);
      }

      const payload = ZCISendInvoice.parse(req.body);
      const result = await this.posService.sendInvoiceEmail(
        orderId,
        payload.email,
      );

      res.status(200).json({
        success: true,
        message: `Invoice email queued for delivery to ${result.recipient}`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Salesman: View own sales history
   */
  getMySales = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const salesmanId = this.getUserId(req);
      const query = ZCIPosSalesQuery.parse(req.query);

      const result = await this.posService.getSalesmanSales(salesmanId, query);

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
   * Salesman: View personal summary & dashboard metrics
   */
  getMySummary = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const salesmanId = this.getUserId(req);
      const summary = await this.posService.getSalesmanSummary(salesmanId);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Admin / Super Admin: View all POS sales across all salesmen
   */
  getAllPosSales = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = ZCIPosSalesQuery.parse(req.query);
      const result = await this.posService.getAllPosSales(query);

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
   * Admin / Super Admin: Salesmen Leaderboard and Performance Breakdown
   */
  getSalesmenPerformance = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = ZCIPosPerformanceQuery.parse(req.query);
      const performance = await this.posService.getSalesmenPerformance(query);

      res.status(200).json({
        success: true,
        data: performance,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Admin / Super Admin: Product Variant Sales Report
   */
  getVariantSalesReport = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = ZCIPosPerformanceQuery.parse(req.query);
      const report = await this.posService.getVariantSalesReport(query);

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  };
}

