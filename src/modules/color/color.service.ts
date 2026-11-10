import type { RedisDatabase } from '../../common/redis';
import { AppError } from '../../common/utils/AppError';
import {
  catchPrismaUniqueError,
  isPrismaForeignKeyError,
  isPrismaNotFoundError,
  isPrismaUniqueConstraintError,
} from '../../common/utils/prisma-error';
import { logger } from '../../config/logger';
import type { Database } from '../../db/prisma';
import type { ZCTColor, ZCTColorQuery, ZCTUpdateColor } from './color.schema';

export class ColorService {
  private static readonly CACHE_KEY = 'colors:all';
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

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async invalidateCache() {
    try {
      await this.redis.del(ColorService.CACHE_KEY);
    } catch (error) {
      logger.warn(
        { err: error, cacheKey: ColorService.CACHE_KEY },
        'Failed to invalidate colors cache',
      );
    }
  }

  async createColor(data: ZCTColor) {
    const slug = data.slug
      ? this.generateSlug(data.slug)
      : this.generateSlug(data.name);

    try {
      const color = await this.prisma.color.create({
        data: {
          name: data.name,
          slug,
          hex: data.hex ?? null,
          isActive: data.isActive ?? true,
        },
      });

      await this.invalidateCache();

      return color;
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        logger.warn(
          { err: error, slug, name: data.name },
          'Color creation failed due to duplicate field',
        );
        catchPrismaUniqueError(error, 'Color');
      }

      logger.error(
        { err: error, slug, name: data.name },
        'Failed to create color',
      );
      throw error;
    }
  }

  async getAllColors(query?: ZCTColorQuery) {
    const hasFilter = Boolean(query?.search) || query?.isActive !== undefined;

    if (!hasFilter) {
      try {
        const cached = await this.redis.get(ColorService.CACHE_KEY);

        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        logger.warn(
          { err: error, cacheKey: ColorService.CACHE_KEY },
          'Failed to read colors from cache',
        );
      }
    }

    try {
      const colors = await this.prisma.color.findMany({
        where: {
          ...(query?.isActive !== undefined && { isActive: query.isActive }),
          ...(query?.search && {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { slug: { contains: query.search, mode: 'insensitive' } },
            ],
          }),
        },
        orderBy: {
          name: 'asc',
        },
      });

      if (!hasFilter) {
        try {
          await this.redis.set(
            ColorService.CACHE_KEY,
            JSON.stringify(colors),
            'EX',
            ColorService.CACHE_TTL,
          );
        } catch (error) {
          logger.warn(
            { err: error, cacheKey: ColorService.CACHE_KEY },
            'Failed to cache colors',
          );
        }
      }
      return colors;
    } catch (error) {
      logger.error(
        { err: error, search: query?.search, isActive: query?.isActive },
        'Failed to fetch colors',
      );
      throw error;
    }
  }

  async getColorById(id: string) {
    try {
      const color = await this.prisma.color.findUnique({
        where: { id },
        include: {
          _count: {
            select: { variants: true },
          },
        },
      });

      if (!color) {
        logger.warn({ colorId: id }, 'Color not found');
        throw new AppError('Color not found', 404);
      }

      return color;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error({ err: error, colorId: id }, 'Failed to fetch color');
      throw error;
    }
  }

  async updateColor(id: string, data: ZCTUpdateColor) {
    const slug = data.slug
      ? this.generateSlug(data.slug)
      : data.name
        ? this.generateSlug(data.name)
        : undefined;

    try {
      const updated = await this.prisma.color.update({
        where: { id },
        data: {
          ...data,
          ...(slug ? { slug } : {}),
        },
      });

      await this.invalidateCache();

      return updated;
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        logger.warn(
          { err: error, colorId: id, slug },
          'Color update failed due to duplicate field',
        );
        catchPrismaUniqueError(error, 'Color');
      }

      if (isPrismaNotFoundError(error)) {
        logger.warn({ colorId: id }, 'Color not found for update');
        throw new AppError('Color not found', 404);
      }

      logger.error({ err: error, colorId: id, slug }, 'Failed to update color');
      throw error;
    }
  }

  async deleteColor(id: string) {
    const color = await this.getColorById(id);

    if (color._count.variants > 0) {
      logger.warn(
        { colorId: id, variantCount: color._count.variants },
        'Cannot delete color associated with existing product variants',
      );
      throw new AppError(
        'Cannot delete color associated with existing product variants',
        400,
      );
    }

    try {
      const deleted = await this.prisma.color.delete({
        where: { id },
      });

      await this.invalidateCache();

      return deleted;
    } catch (error) {
      if (isPrismaForeignKeyError(error)) {
        logger.warn(
          { err: error, colorId: id },
          'Cannot delete color associated with existing product variants',
        );
        throw new AppError(
          'Cannot delete color associated with existing product variants',
          400,
        );
      }

      if (isPrismaNotFoundError(error)) {
        logger.warn({ colorId: id }, 'Color not found for deletion');
        throw new AppError('Color not found', 404);
      }

      logger.error({ err: error, colorId: id }, 'Failed to delete color');
      throw error;
    }
  }
}
