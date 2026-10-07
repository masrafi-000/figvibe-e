import type { NextFunction, Request, Response } from 'express';
import type { AuditService } from '../audit/audit.service';
import type { FabricService } from './fabric.service';
import {
  ZCIFabric,
  ZCIFabricQuery,
  ZCIUpdateFabric,
} from './fabric.schema';
import { AppError } from '../../common/utils/AppError';

export class FabricController {
  constructor(
    private readonly fabricService: FabricService,
    private readonly auditService: AuditService,
  ) {}

  // Create Fabric
  createFabric = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const payload = ZCIFabric.parse(req.body);

      const fabric = await this.fabricService.createFabric(payload);

      void this.auditService.log({
        req,
        action: 'CREATE',
        status: 'SUCCESS',
        resource: 'Fabric',
        resourceId: fabric.id,
        description: `Fabric '${fabric.name}' created by ${req.user?.email || 'user'}`,
        oldValues: null,
        newValues: {
          name: fabric.name,
          slug: fabric.slug,
          description: fabric.description,
          isActive: fabric.isActive,
        },
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
        message: 'Fabric created successfully',
        data: { fabric },
      });
    } catch (error) {
      next(error);
    }
  };

  // Get All Fabrics
  getAllFabrics = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = ZCIFabricQuery.parse(req.query);
      const result = await this.fabricService.getAllFabrics(query);

      res.status(200).json({
        success: true,
        meta: result.meta,
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  };

  // Get Fabric By Id
  getFabricById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('Fabric ID is required', 400);

      const fabric = await this.fabricService.getFabricById(id);

      res.status(200).json({
        success: true,
        data: { fabric },
      });
    } catch (error) {
      next(error);
    }
  };

  // Update Fabric
  updateFabric = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('Fabric ID is required', 400);

      const payload = ZCIUpdateFabric.parse(req.body);
      if (Object.keys(payload).length === 0) {
        throw new AppError('No update fields provided', 400);
      }

      const oldFabric = await this.fabricService.getFabricById(id);
      const fabric = await this.fabricService.updateFabric(id, payload);

      void this.auditService.log({
        req,
        action: 'UPDATE',
        status: 'SUCCESS',
        resource: 'Fabric',
        resourceId: id,
        description: `Fabric '${oldFabric.name}' updated by ${req.user?.email || 'user'}`,
        oldValues: {
          name: oldFabric.name,
          slug: oldFabric.slug,
          description: oldFabric.description,
          isActive: oldFabric.isActive,
        },
        newValues: {
          name: fabric.name,
          slug: fabric.slug,
          description: fabric.description,
          isActive: fabric.isActive,
        },
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
        message: 'Fabric updated successfully',
        data: { fabric },
      });
    } catch (error) {
      next(error);
    }
  };

  // Delete Fabric
  deleteFabric = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('Fabric ID is required', 400);

      const fabric = await this.fabricService.getFabricById(id);
      await this.fabricService.deleteFabric(id);

      void this.auditService.log({
        req,
        action: 'DELETE',
        status: 'SUCCESS',
        resource: 'Fabric',
        resourceId: id,
        description: `Fabric '${fabric.name}' deleted by ${req.user?.email || 'user'}`,
        oldValues: {
          name: fabric.name,
          slug: fabric.slug,
          description: fabric.description,
          isActive: fabric.isActive,
        },
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
        message: 'Fabric deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}