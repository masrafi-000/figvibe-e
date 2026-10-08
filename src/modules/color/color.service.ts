import type { RedisDatabase } from '../../common/redis';
import { AppError } from '../../common/utils/AppError';
import type { Database } from '../../db/prisma';
import type { ZCTColor, ZCTColorQuery, ZCTUpdateColor } from './color.schema';

export class ColorService {
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

  async createColor(data: ZCTColor) {
    const slug = data.slug || this.generateSlug(data.name);
    const existing = await this.prisma.color.findUnique({ where: { slug } });

    if (existing) {
      throw new AppError(`Color with slug '${slug}' already exists`, 409);
    }

    const color = await this.prisma.color.create({
      data: {
        name: data.name,
        slug,
        hex: data.hex ?? null,
        isActive: data.isActive ?? true,
      },
    });

    await this.redis.del('colors:all').catch(() => null);
    return color;
  }

  async getAllColors(query?: ZCTColorQuery) {
    const cacheKey = 'colors:all';

    if (!query?.search && query?.isActive === undefined) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
      } catch {
        // Fallthrough
      }
    }

    const colors = await this.prisma.color.findMany({
      where: {
        ...(query?.isActive !== undefined ? { isActive: query.isActive } : {}),
        ...(query?.search
          ? {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                { slug: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
    });

    if (!query?.search && query?.isActive === undefined) {
      await this.redis
        .set(cacheKey, JSON.stringify(colors), 'EX', 1800)
        .catch(() => null);
    }

    return colors;
  }

  async getColorById(id: string) {
    const color = await this.prisma.color.findUnique({
      where: { id },
      include: {
        _count: { select: { variants: true } },
      },
    });

    if (!color) {
      throw new AppError('Color not found', 404);
    }
    return color;
  }

  async updateColor(id: string, data: ZCTUpdateColor) {
    const oldColor = await this.getColorById(id);

    const slug = data.slug
      ? this.generateSlug(data.slug)
      : data.name
        ? this.generateSlug(data.name)
        : undefined;

    if (slug && slug !== oldColor.slug) {
      const existing = await this.prisma.color.findUnique({ where: { slug } });
      if (existing) {
        throw new AppError(`Color with slug '${slug}' already exists`, 409);
      }
    }

    const updated = await this.prisma.color.update({
      where: { id },
      data: {
        ...data,
        ...(slug ? { slug } : {}),
      },
    });

    await this.redis.del('colors:all').catch(() => null);
    return updated;
  }

  async deleteColor(id: string) {
    const color = await this.getColorById(id);

    if (color._count.variants > 0) {
      throw new AppError(
        'Cannot delete color associated with existing product variants',
        400,
      );
    }

    const deleted = await this.prisma.color.delete({ where: { id } });
    await this.redis.del('colors:all').catch(() => null);
    return deleted;
  }
}
