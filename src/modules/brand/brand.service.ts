import { AppError } from '../../common/utils/AppError';
import type { Database } from '../../db/prisma';
import type { Prisma } from '../../generated/prisma/client';
import type { ZCTBrand, ZCTBrandQuery, ZCTUpdateBrand } from './brand.schema';

export class BrandService {
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

  async createBrand(data: ZCTBrand) {
    const slug = data.slug || this.generateSlug(data.name);

    const existing = await this.prisma.brand.findUnique({ where: { slug } });
    if (existing) {
      throw new AppError(`Brand '${slug}' already exists`, 409);
    }

    return await this.prisma.brand.create({
      data: { ...data, slug },
    });
  }

  async getAllBrands(query: ZCTBrandQuery) {
    const { page = 1, limit = 20, search, isActive } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.BrandWhereInput = {
      ...(isActive !== undefined ? { isActive } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [total, brands] = await Promise.all([
      this.prisma.brand.count({ where }),
      this.prisma.brand.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: { _count: { select: { products: true } } },
      }),
    ]);

    return {
      data: brands,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getBrandById(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!brand) {
      throw new AppError('Brand not found', 404);
    }
    return brand;
  }

  async updateBrand(id: string, data: ZCTUpdateBrand) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });

    if (!brand) {
      throw new AppError('Brand not found', 404);
    }

    const slug = data.slug
      ? this.generateSlug(data.slug)
      : data.name
        ? this.generateSlug(data.name)
        : undefined;

    return await this.prisma.brand.update({
      where: { id },
      data: {
        ...data,
        ...(slug ? { slug } : {}),
      },
    });
  }

  async deleteBrand(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true } },
      },
    });

    if (!brand) {
      throw new AppError('Brand not found', 404);
    }

    if (brand._count.products > 0) {
      throw new AppError('Cannot delete brand with associated products', 400);
    }

    return await this.prisma.brand.delete({ where: { id } });
  }
}
