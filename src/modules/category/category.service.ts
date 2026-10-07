import { AppError } from '../../common/utils/AppError';
import type { Database } from '../../db/prisma';
import type { Prisma } from '../../generated/prisma/client';
import type {
  ZCTCategory,
  ZCTCategoryQuery,
  ZCTUpdateCategory,
} from './category.schema';

export class CategoryService {
  constructor(private readonly database: Database) {}

  private get prisma() {
    return this.database.client;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async createCategory(data: ZCTCategory) {
    const slug = data.slug || this.generateSlug(data.name);

    const existing = await this.prisma.category.findUnique({ where: { slug } });

    if (existing) {
      throw new AppError(`Category with slug '${slug}' already exists`, 409);
    }

    if (data.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: data.parentId },
      });
      if (!parent) {
        throw new AppError('Parent category not found', 404);
      }
    }

    return await this.prisma.category.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        imageUrl: data.imageUrl,
        parentId: data.parentId ?? null,
        isActive: data.isActive ?? true,
      },
      include: {
        parent: true,
      },
    });
  }

  async getAllCategories(query: ZCTCategoryQuery) {
    const { page = 1, limit = 20, search, isActive, parentId } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.CategoryWhereInput = {
      ...(isActive !== undefined ? { isActive } : {}),
      ...(parentId !== undefined ? { parentId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, categories] = await Promise.all([
      this.prisma.category.count({ where }),
      this.prisma.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          parent: { select: { id: true, name: true, slug: true } },
          children: {
            select: { id: true, name: true, slug: true, isActive: true },
          },
          _count: { select: { products: true, children: true } },
        },
      }),
    ]);

    return {
      data: categories,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCategoryTree() {
    return await this.prisma.category.findMany({
      where: { parentId: null, isActive: true },
      include: {
        children: {
          where: { isActive: true },
          include: {
            children: { where: { isActive: true } },
            _count: { select: { products: true } },
          },
        },
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getCategoryById(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      throw new AppError('Category not found', 404);
    }
    return category;
  }

  async updateCategory(id: string, data: ZCTUpdateCategory) {
    await this.getCategoryById(id);

    if (data.parentId && data.parentId === id) {
      throw new AppError('A category connot be its own parent', 400);
    }

    const slug = data.slug
      ? this.generateSlug(data.slug)
      : data.name
        ? this.generateSlug(data.name)
        : undefined;

    return await this.prisma.category.update({
      where: { id },
      data: {
        ...data,
        ...(slug ? { slug } : {}),
      },
      include: { parent: true, children: true },
    });
  }

  async deleteCategory(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true, children: true } } },
    });

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    if (category._count.products > 0) {
      throw new AppError(
        'Cannot delete categroy with associated products',
        400,
      );
    }

    if (category._count.children > 0) {
      throw new AppError(
        'Cannot delete category with subcategories. Reassign or delete subcategories first.',
        400,
      );
    }

    return await this.prisma.category.delete({ where: { id } });
  }
}
