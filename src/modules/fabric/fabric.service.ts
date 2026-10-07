import { AppError } from '../../common/utils/AppError';
import type { Database } from '../../db/prisma';
import type { Prisma } from '../../generated/prisma/client';
import type {
  ZCTFabric,
  ZCTFabricQuery,
  ZCTUpdateFabric,
} from './fabric.schema';

export class FabricService {
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

  async createFabric(data: ZCTFabric) {
    const slug = data.slug || this.generateSlug(data.name);

    const existing = await this.prisma.fabric.findUnique({ where: { slug } });

    if (existing) {
      throw new AppError(`Fabric with slug '${slug}' already exists`, 409);
    }

    return await this.prisma.fabric.create({
      data: { ...data, slug },
    });
  }

  async getAllFabrics(query: ZCTFabricQuery) {
    const { page = 1, limit = 20, search, isActive } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.FabricWhereInput = {
      ...(isActive !== undefined ? { isActive } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };
    const [total, fabrics] = await Promise.all([
      this.prisma.fabric.count({ where }),
      this.prisma.fabric.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: { _count: { select: { products: true } } },
      }),
    ]);
    return {
      data: fabrics,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getFabricById(id: string) {
    const fabric = await this.prisma.fabric.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!fabric) {
      throw new AppError('Fabric not found', 404);
    }
    return fabric;
  }

  async updateFabric(id: string, data: ZCTUpdateFabric) {
    const fabric = await this.prisma.fabric.findUnique({ where: { id } });
    if (!fabric) throw new AppError('Fabric not found', 404);
    const slug = data.slug
      ? this.generateSlug(data.slug)
      : data.name
        ? this.generateSlug(data.name)
        : undefined;
    return await this.prisma.fabric.update({
      where: { id },
      data: { ...data, ...(slug ? { slug } : {}) },
    });
  }

  async deleteFabric(id: string) {
    const fabric = await this.prisma.fabric.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!fabric) throw new AppError('Fabric not found', 404);
    if (fabric._count.products > 0) {
      throw new AppError('Cannot delete fabric with associated products', 400);
    }
    return await this.prisma.fabric.delete({ where: { id } });
  }
}
