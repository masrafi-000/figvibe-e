import type { CategoryService } from './category.service';
import type { AuditService } from '../audit/audit.service';
import type { NextFunction, Request, Response } from 'express';
import {
  ZCICategory,
  ZCICategoryQuery,
  ZCIUpdateCategory,
} from './category.schema';
import { AppError } from '../../common/utils/AppError';

export class CategoryController {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly auditService: AuditService,
  ) {}

  // Category Handler
  getAllCategories = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = ZCICategoryQuery.parse(req.query);
      const result = await this.categoryService.getAllCategories(query);

      res.status(200).json({
        success: true,
        meta: result.meta,
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  };

  getCategoryById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('Category ID is required', 400);

      const category = await this.categoryService.getCategoryById(id);

      res.status(200).json({
        success: true,
        data: { category },
      });
    } catch (error) {
      next(error);
    }
  };

  createCategory = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const payload = ZCICategory.parse(req.body);

      const category = await this.categoryService.createCategory(payload);

      void this.auditService.log({
        req,
        action: 'CREATE',
        status: 'SUCCESS',
        resource: 'Category',
        resourceId: category.id,
        description: `Category '${category.name}' created by ${req.user?.email || 'user'}`,
        oldValues: null,
        newValues: {
          name: category.name,
          slug: category.slug,
          description: category.description,
          parentId: category.parentId,
          isActive: category.isActive,
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
        message: 'Category created successfully',
        data: { category },
      });
    } catch (error) {
      next(error);
    }
  };

  updateCategory = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('Category ID is required', 400);

      const payload = ZCIUpdateCategory.parse(req.body);
      if (Object.keys(payload).length === 0)
        throw new AppError('No update fields provided', 400);

      const oldCategory = await this.categoryService.getCategoryById(id);

      const category = await this.categoryService.updateCategory(id, payload);

      void this.auditService.log({
        req,
        action: 'UPDATE',
        status: 'SUCCESS',
        resource: 'Category',
        resourceId: id,
        description: `Category '${oldCategory.name}' updated by ${req.user?.email || 'user'}`,
        oldValues: {
          name: oldCategory.name,
          slug: oldCategory.slug,
          description: oldCategory.description,
          parentId: oldCategory.parentId,
          isActive: oldCategory.isActive,
        },
        newValues: {
          name: category.name,
          slug: category.slug,
          description: category.description,
          parentId: category.parentId,
          isActive: category.isActive,
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
        message: 'Category updated successfully',
        data: { category },
      });
    } catch (error) {
      next(error);
    }
  };

  getCategoryTree = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const tree = await this.categoryService.getCategoryTree();

      res.status(200).json({
        success: true,
        data: { tree },
      });
    } catch (error) {
      next(error);
    }
  };

  deleteCategory = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;

      if (!id) throw new AppError('Category Id is required', 400);

      const category = await this.categoryService.getCategoryById(id);

      await this.categoryService.deleteCategory(id);

      void this.auditService.log({
        req,
        action: 'DELETE',
        status: 'SUCCESS',
        resource: 'Category',
        resourceId: id,
        description: `Category '${category.name}' deleted by ${req.user?.email || 'user'}`,
        oldValues: {
          name: category.name,
          slug: category.slug,
          description: category.description,
          parentId: category.parentId,
          isActive: category.isActive,
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
        message: 'Category deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}
