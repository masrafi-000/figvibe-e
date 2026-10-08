import type { NextFunction, Request, Response } from 'express';
import type { AuditService } from '../audit/audit.service';
import type { ProductService } from './product.service';
import {
  ZCIProduct,
  ZCIProductQuery,
  ZCIProductVariant,
  ZCIUpdateProduct,
  ZCIUpdateProductVariant,
} from './product.schema';
import { AppError } from '../../common/utils/AppError';

export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly auditService: AuditService,
  ) {}

  // Create Product
  createProduct = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const payload = ZCIProduct.parse(req.body);
      const product = await this.productService.createProduct(payload);

      void this.auditService.log({
        req,
        action: 'CREATE',
        status: 'SUCCESS',
        resource: 'Product',
        resourceId: product.id,
        description: `Product '${product.name}' created`,
        oldValues: null,
        newValues: {
          name: product.name,
          slug: product.slug,
          status: product.status,
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
        message: 'Product created successfully',
        data: { product },
      });
    } catch (error) {
      next(error);
    }
  };

  // Get All Products
  getAllProducts = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const query = ZCIProductQuery.parse(req.query);
      const result = await this.productService.getAllProducts(query);
      res.status(200).json({
        success: true,
        meta: result.meta,
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  };

  // Get Product By Id
  getProductById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('Product ID is required', 400);

      const product = await this.productService.getProductById(id);
      res.status(200).json({ success: true, data: { product } });
    } catch (error) {
      next(error);
    }
  };

  // Get Product By Slug
  getProductBySlug = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const slug = req.params.slug as string;
      if (!slug) throw new AppError('Product slug is required', 400);

      const product = await this.productService.getProductBySlug(slug);
      res.status(200).json({ success: true, data: { product } });
    } catch (error) {
      next(error);
    }
  };

  // Update Product
  updateProduct = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('Product ID is required', 400);

      const payload = ZCIUpdateProduct.parse(req.body);
      const oldProduct = await this.productService.getProductById(id);
      const product = await this.productService.updateProduct(id, payload);

      void this.auditService.log({
        req,
        action: 'UPDATE',
        status: 'SUCCESS',
        resource: 'Product',
        resourceId: id,
        description: `Product '${oldProduct.name}' updated`,
        oldValues: { name: oldProduct.name, status: oldProduct.status },
        newValues: { name: product.name, status: product.status },
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
        message: 'Product updated successfully',
        data: { product },
      });
    } catch (error) {
      next(error);
    }
  };

  // Delete Product
  deleteProduct = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      if (!id) throw new AppError('Product ID is required', 400);

      const product = await this.productService.getProductById(id);
      await this.productService.deleteProduct(id);

      void this.auditService.log({
        req,
        action: 'DELETE',
        status: 'SUCCESS',
        resource: 'Product',
        resourceId: id,
        description: `Product '${product.name}' deleted`,
        oldValues: { name: product.name },
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

      res
        .status(200)
        .json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
      next(error);
    }
  };

  // Create Variant
  createVariant = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const productId = req.params.id as string;
      if (!productId) throw new AppError('Product ID is required', 400);

      const payload = ZCIProductVariant.parse(req.body);
      const variant = await this.productService.createVariant(
        productId,
        payload,
      );

      res.status(201).json({
        success: true,
        message: 'Product variant created successfully',
        data: { variant },
      });
    } catch (error) {
      next(error);
    }
  };

  // Update Variant
  updateVariant = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const variantId = req.params.variantId as string;
      if (!variantId) throw new AppError('Variant ID is required', 400);

      const payload = ZCIUpdateProductVariant.parse(req.body);
      const variant = await this.productService.updateVariant(
        variantId,
        payload,
      );

      res.status(200).json({
        success: true,
        message: 'Product variant updated successfully',
        data: { variant },
      });
    } catch (error) {
      next(error);
    }
  };

  // Delete Variant
  deleteVariant = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const variantId = req.params.variantId as string;
      if (!variantId) throw new AppError('Variant ID is required', 400);

      await this.productService.deleteVariant(variantId);

      res.status(200).json({
        success: true,
        message: 'Product variant deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}
