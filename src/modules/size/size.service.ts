import type { RedisDatabase } from '../../common/redis';
import { AppError } from '../../common/utils/AppError';
import type { Database } from '../../db/prisma';
import type { ZCTSize, ZCTSizeQuery, ZCTUpdateSize } from './size.schema';

export class SizeService {
  constructor(
    private readonly database: Database,
    private readonly redisDb: RedisDatabase,
  ) {}

  private get prisma() {
    return this.database.client;
  }

  private get redis() {
    return this.redisDb.client;
  }

  async createSize(data: ZCTSize) {
    const existing = await this.prisma.size.findFirst({
      where: { OR: [{ name: data.name }, { code: data.code }] },
    });

    if (existing) {
      throw new AppError('Size with this name or code already exists', 409);
    }

    const size = await this.prisma.size.create({ data });
    await this.redis.del('sizes:all').catch(() => null);
    return size;
  }

  async getAllSizes(query?: ZCTSizeQuery) {
    const cacheKey = 'sizes:all';

    if (!query?.search && query?.isActive === undefined) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
      } catch {
        // Fallthrough
      }
    }

    const sizes = await this.prisma.size.findMany({
      where: {
        ...(query?.isActive !== undefined ? { isActive: query.isActive } : {}),
        ...(query?.search
          ? {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                { code: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { sortOrder: 'asc' },
    });

    if (!query?.search && query?.isActive === undefined) {
      await this.redis
        .set(cacheKey, JSON.stringify(sizes), 'EX', 1800)
        .catch(() => null);
    }

    return sizes;
  }

  async getSizeById(id: string) {
    const size = await this.prisma.size.findUnique({
      where: { id },
      include: {
        _count: { select: { variants: true } },
      },
    });

    if (!size) {
      throw new AppError('Size not found', 404);
    }
    return size;
  }

  async updateSize(id: string, data: ZCTUpdateSize) {
    await this.getSizeById(id);

    if (data.name || data.code) {
      const existing = await this.prisma.size.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(data.name ? [{ name: data.name }] : []),
            ...(data.code ? [{ code: data.code }] : []),
          ],
        },
      });
      if (existing) {
        throw new AppError(
          'Another size with this name or code already exists',
          409,
        );
      }
    }

    const updated = await this.prisma.size.update({
      where: { id },
      data,
    });

    await this.redis.del('sizes:all').catch(() => null);
    return updated;
  }

  async deleteSize(id: string) {
    const size = await this.getSizeById(id);

    if (size._count.variants > 0) {
      throw new AppError(
        'Cannot delete size associated with existing product variants',
        400,
      );
    }

    const deleted = await this.prisma.size.delete({ where: { id } });
    await this.redis.del('sizes:all').catch(() => null);
    return deleted;
  }
}
