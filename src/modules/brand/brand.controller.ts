import type { NextFunction, Request, Response } from 'express';
import type { AuditService } from '../audit/audit.service';
import type { BrandService } from './brand.service';
import { ZCIBrand, ZCIBrandQuery, ZCIUpdateBrand } from './brand.schema';
import { AppError } from '../../common/utils/AppError';

export class BrandController {
  constructor(
    private readonly brandService: BrandService,
    private readonly auditService: AuditService,
  ) {}

  // Create Brand
  createBrand = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const payload = ZCIBrand.parse(req.body);

      const brand = await this.brandService.createBrand(payload);

      void this.auditService.log({
        req,
        action: 'CREATE',
        status: 'SUCCESS',
        resource: 'Brand',
        resourceId: brand.id,
        description: `Brand '${brand.name}' created by ${req.user?.email || 'user'}`,
        oldValues: null,
        newValues: {
          name: brand.name,
          slug: brand.slug,
          description: brand.description,
          logoUrl: brand.logoUrl,
          isActive: brand.isActive,
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
        message: 'Brand created successfully',
        data: { brand },
      });
    } catch (error) {
      next(error);
    }
  };

  // Get All Brands
  getAllBrands = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = ZCIBrandQuery.parse(req.query);

      const result = await this.brandService.getAllBrands(query);

      res.status(200).json({
        success: true,
        meta: result.meta,
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  };

  // Get Brand By Id
  getBrandById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('Brand ID is required', 400);

      const brand = await this.brandService.getBrandById(id);

      res.status(200).json({
        success: true,
        data: { brand },
      });
    } catch (error) {
      next(error);
    }
  };

  // Update Brand
  updateBrand = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('Brand ID is required', 400);

      const payload = ZCIUpdateBrand.parse(req.body);
      if (Object.keys(payload).length === 0) {
        throw new AppError('No update fields provided', 400);
      }

      const oldBrand = await this.brandService.getBrandById(id);
      const brand = await this.brandService.updateBrand(id, payload);

      void this.auditService.log({
        req,
        action: 'UPDATE',
        status: 'SUCCESS',
        resource: 'Brand',
        resourceId: id,
        description: `Brand '${oldBrand.name}' updated by ${req.user?.email || 'user'}`,
        oldValues: {
          name: oldBrand.name,
          slug: oldBrand.slug,
          description: oldBrand.description,
          logoUrl: oldBrand.logoUrl,
          isActive: oldBrand.isActive,
        },
        newValues: {
          name: brand.name,
          slug: brand.slug,
          description: brand.description,
          logoUrl: brand.logoUrl,
          isActive: brand.isActive,
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
        message: 'Brand updated successfully',
        data: { brand },
      });
    } catch (error) {
      next(error);
    }
  };

  // Delete Brand
  deleteBrand = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('Brand ID is required', 400);

      const brand = await this.brandService.getBrandById(id);
      await this.brandService.deleteBrand(id);

      void this.auditService.log({
        req,
        action: 'DELETE',
        status: 'SUCCESS',
        resource: 'Brand',
        resourceId: id,
        description: `Brand '${brand.name}' deleted by ${req.user?.email || 'user'}`,
        oldValues: {
          name: brand.name,
          slug: brand.slug,
          description: brand.description,
          logoUrl: brand.logoUrl,
          isActive: brand.isActive,
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
        message: 'Brand deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}
