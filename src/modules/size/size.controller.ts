import type { NextFunction, Request, Response } from 'express';
import type { AuditService } from '../audit/audit.service';
import type { SizeService } from './size.service';
import { ZCISize, ZCISizeQuery, ZCIUpdateSize } from './size.schema';
import { AppError } from '../../common/utils/AppError';

export class SizeController {
  constructor(
    private readonly sizeService: SizeService,
    private readonly auditService: AuditService,
  ) {}

  createSize = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const payload = ZCISize.parse(req.body);
      const size = await this.sizeService.createSize(payload);

      void this.auditService.log({
        req,
        action: 'CREATE',
        status: 'SUCCESS',
        resource: 'Size',
        resourceId: size.id,
        description: `Size '${size.name}' (${size.code}) created`,
        oldValues: null,
        newValues: { name: size.name, code: size.code },
        actorType: 'USER',
        actorId: req.user?.id || req.user?.userId || null,
        actorEmail: req.user?.email || null,
        ipAddress:
          (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
          req.ip ||
          null,
        userAgent: req.get('user-agent') || null,
        requestId: (req.headers['x-request-id'] as string) || null,
        metadata: {
          role: req.user?.role || null,
          createdAt: new Date().toISOString(),
        },
      });

      res.status(201).json({
        success: true,
        message: 'Size created successfully',
        data: { size },
      });
    } catch (error) {
      next(error);
    }
  };

  getAllSizes = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = ZCISizeQuery.parse(req.query);
      const sizes = await this.sizeService.getAllSizes(query);
      res.status(200).json({
        success: true,
        data: { sizes },
      });
    } catch (error) {
      next(error);
    }
  };

  getSizeById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('Size ID is required', 400);

      const size = await this.sizeService.getSizeById(id);
      res.status(200).json({
        success: true,
        data: { size },
      });
    } catch (error) {
      next(error);
    }
  };

  updateSize = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('Size ID is required', 400);

      const payload = ZCIUpdateSize.parse(req.body);
      const oldSize = await this.sizeService.getSizeById(id);
      const size = await this.sizeService.updateSize(id, payload);

      void this.auditService.log({
        req,
        action: 'UPDATE',
        status: 'SUCCESS',
        resource: 'Size',
        resourceId: id,
        description: `Size '${oldSize.name}' updated`,
        oldValues: { name: oldSize.name, code: oldSize.code },
        newValues: { name: size.name, code: size.code },
        actorType: 'USER',
        actorId: req.user?.id || req.user?.userId || null,
        actorEmail: req.user?.email || null,
        ipAddress:
          (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
          req.ip ||
          null,
        userAgent: req.get('user-agent') || null,
        requestId: (req.headers['x-request-id'] as string) || null,
        metadata: {
          role: req.user?.role || null,
          updatedAt: new Date().toISOString(),
        },
      });

      res.status(200).json({
        success: true,
        message: 'Size updated successfully',
        data: { size },
      });
    } catch (error) {
      next(error);
    }
  };

  deleteSize = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('Size ID is required', 400);

      const size = await this.sizeService.getSizeById(id);
      await this.sizeService.deleteSize(id);

      void this.auditService.log({
        req,
        action: 'DELETE',
        status: 'SUCCESS',
        resource: 'Size',
        resourceId: id,
        description: `Size '${size.name}' deleted`,
        oldValues: { name: size.name, code: size.code },
        newValues: null,
        actorType: 'USER',
        actorId: req.user?.id || req.user?.userId || null,
        actorEmail: req.user?.email || null,
        ipAddress:
          (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
          req.ip ||
          null,
        userAgent: req.get('user-agent') || null,
        requestId: (req.headers['x-request-id'] as string) || null,
        metadata: {
          role: req.user?.role || null,
          deletedAt: new Date().toISOString(),
        },
      });

      res.status(200).json({
        success: true,
        message: 'Size deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}
