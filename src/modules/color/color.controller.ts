import type { NextFunction, Request, Response } from 'express';
import type { AuditService } from '../audit/audit.service';
import type { ColorService } from './color.service';
import { ZCIColor, ZCIColorQuery, ZCIUpdateColor } from './color.schema';
import { AppError } from '../../common/utils/AppError';

export class ColorController {
  constructor(
    private readonly colorService: ColorService,
    private readonly auditService: AuditService,
  ) {}

  createColor = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const payload = ZCIColor.parse(req.body);
      const color = await this.colorService.createColor(payload);

      void this.auditService.log({
        req,
        action: 'CREATE',
        status: 'SUCCESS',
        resource: 'Color',
        resourceId: color.id,
        description: `Color '${color.name}' (${color.slug}) created`,
        oldValues: null,
        newValues: { name: color.name, slug: color.slug, hex: color.hex },
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
        message: 'Color created successfully',
        data: { color },
      });
    } catch (error) {
      next(error);
    }
  };

  getAllColors = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = ZCIColorQuery.parse(req.query);
      const colors = await this.colorService.getAllColors(query);
      res.status(200).json({
        success: true,
        data: { colors },
      });
    } catch (error) {
      next(error);
    }
  };

  getColorById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('Color ID is required', 400);

      const color = await this.colorService.getColorById(id);
      res.status(200).json({
        success: true,
        data: { color },
      });
    } catch (error) {
      next(error);
    }
  };

  updateColor = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('Color ID is required', 400);

      const payload = ZCIUpdateColor.parse(req.body);
      const oldColor = await this.colorService.getColorById(id);
      const color = await this.colorService.updateColor(id, payload);

      void this.auditService.log({
        req,
        action: 'UPDATE',
        status: 'SUCCESS',
        resource: 'Color',
        resourceId: id,
        description: `Color '${oldColor.name}' updated`,
        oldValues: {
          name: oldColor.name,
          slug: oldColor.slug,
          hex: oldColor.hex,
        },
        newValues: { name: color.name, slug: color.slug, hex: color.hex },
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
        message: 'Color updated successfully',
        data: { color },
      });
    } catch (error) {
      next(error);
    }
  };

  deleteColor = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('Color ID is required', 400);

      const color = await this.colorService.getColorById(id);
      await this.colorService.deleteColor(id);

      void this.auditService.log({
        req,
        action: 'DELETE',
        status: 'SUCCESS',
        resource: 'Color',
        resourceId: id,
        description: `Color '${color.name}' deleted`,
        oldValues: { name: color.name, slug: color.slug, hex: color.hex },
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
        message: 'Color deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}
