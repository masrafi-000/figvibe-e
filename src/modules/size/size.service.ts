import type { RedisDatabase } from '../../common/redis';
import { AppError } from '../../common/utils/AppError';
import {
  catchPrismaUniqueError,
  isPrismaUniqueConstraintError,
} from '../../common/utils/prisma-error';
import { logger } from '../../config/logger';
import type { Database } from '../../db/prisma';
import type { ZCTSize, ZCTSizeQuery, ZCTUpdateSize } from './size.schema';

export class SizeService {
  private static readonly CACHE_KEY = 'sizes:all';
  private static readonly CACHE_TTL = 1800;

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

  private async invalidateCache() {
    await this.redis.del(SizeService.CACHE_KEY).catch((err) => {
      logger.warn({ err }, 'Failed to invalidate size cache');
    });
  }

  async createSize(data: ZCTSize) {
    try {
      const size = await this.prisma.size.create({
        data,
      });

      await this.invalidateCache();

      return size;
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        logger.warn(
          { err: error, data },
          'Size creation failed due to unique constraint',
        );
        catchPrismaUniqueError(error, 'Size');
      }

      logger.error({ err: error, data }, 'Failed to create size');
      throw error;
    }
  }

  async getAllSizes(query?: ZCTSizeQuery) {
    const isDefaultQuery = !query?.search && query?.isActive === undefined;

    if (isDefaultQuery) {
      try {
        const cached = await this.redis.get(SizeService.CACHE_KEY);

        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        logger.warn({ err: error }, 'Failed to retrieve sizes from cache');
        // Fallthrough to DB
      }
    }

    const sizes = await this.prisma.size.findMany({
      where: {
        ...(query?.isActive !== undefined && { isActive: query.isActive }),
        ...(query?.search && {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { code: { contains: query.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { sortOrder: 'asc' },
    });

    if (isDefaultQuery) {
      await this.redis
        .set(
          SizeService.CACHE_KEY,
          JSON.stringify(sizes),
          'EX',
          SizeService.CACHE_TTL,
        )
        .catch((err) => {
          logger.warn({ err }, 'Failed to cache sizes');
        });
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
      logger.warn({ sizeId: id }, 'Size not found');
      throw new AppError('Size not found', 404);
    }
    return size;
  }

  async updateSize(id: string, data: ZCTUpdateSize) {
    await this.getSizeById(id);

    if (data.name !== undefined || data.code !== undefined) {
      const existing = await this.prisma.size.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(data.name !== undefined ? [{ name: data.name }] : []),
            ...(data.code !== undefined ? [{ code: data.code }] : []),
          ],
        },
      });

      if (existing) {
        logger.warn(
          { sizeId: id, data },
          'Size update failed due to duplicate name or code',
        );
        throw new AppError(
          'Another size with this name or code already exists',
          409,
        );
      }
    }

    try {
      const updated = await this.prisma.size.update({
        where: { id },
        data,
      });

      await this.invalidateCache();
      return updated;
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        logger.warn(
          { err: error, sizeId: id, data },
          'Size update failed due to unique constraint',
        );
        catchPrismaUniqueError(error, 'Size');
      }

      logger.error({ err: error, sizeId: id, data }, 'Failed to update size');
      throw error;
    }
  }

  async deleteSize(id: string) {
    const size = await this.getSizeById(id);

    if (size._count.variants > 0) {
      logger.warn(
        { sizeId: id, variantCount: size._count.variants },
        'Cannot delete size associated with existing product variants',
      );
      throw new AppError('Size is associated with variants', 400);
    }

    try {
      const deleted = await this.prisma.size.delete({
        where: { id },
      });

      await this.invalidateCache();

      return deleted;
    } catch (error) {
      logger.error({ err: error, sizeId: id }, 'Failed to delete size');
      throw error;
    }
  }
}
