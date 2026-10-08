import type { RedisDatabase } from '../../common/redis';
import { AppError } from '../../common/utils/AppError';
import type { Database } from '../../db/prisma';
import type { Prisma } from '../../generated/prisma/client';
import type {
  ZCTColor,
  ZCTProduct,
  ZCTProductQuery,
  ZCTProductVariant,
  ZCTSize,
  ZCTUpdateProduct,
  ZCTUpdateProductVariant,
} from './product.schema';

export class ProductService {
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

  // Cache Invalidation Helper
  private async invalidateProductCache(
    id?: string,
    slug?: string,
  ): Promise<void> {
    try {
      const keys: string[] = [];
      if (id) keys.push(`product:id:${id}`);
      if (slug) keys.push(`product:slug:${slug}`);

      // Find query list cache keys
      const listKeys = await this.redis.keys('products:query:*');
      if (listKeys.length > 0) keys.push(...listKeys);

      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch {
      // Ignore cache failure gracefully
    }
  }

  // --- Size Methods ---
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

  async getAllSizes() {
    const cacheKey = 'sizes:all';
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {
      // Fallthrough to DB
    }

    const sizes = await this.prisma.size.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    await this.redis
      .set(cacheKey, JSON.stringify(sizes), 'EX', 1800)
      .catch(() => null);
    return sizes;
  }

  // --- Color Methods ---
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

  async getAllColors() {
    const cacheKey = 'colors:all';
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {
      // Fallthrough to DB
    }

    const colors = await this.prisma.color.findMany({
      orderBy: { name: 'asc' },
    });

    await this.redis
      .set(cacheKey, JSON.stringify(colors), 'EX', 1800)
      .catch(() => null);
    return colors;
  }

  // --- Product Methods ---
  async createProduct(data: ZCTProduct) {
    // 1. Validate Category
    const category = await this.prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      throw new AppError('Category not found', 404);
    }

    // 2. Validate Brand if provided
    if (data.brandId) {
      const brand = await this.prisma.brand.findUnique({
        where: { id: data.brandId },
      });
      if (!brand) {
        throw new AppError('Brand not found', 404);
      }
    }

    // 3. Validate Fabric if provided
    if (data.fabricId) {
      const fabric = await this.prisma.fabric.findUnique({
        where: { id: data.fabricId },
      });
      if (!fabric) {
        throw new AppError('Fabric not found', 404);
      }
    }

    // 4. Generate & check Slug
    const slug = data.slug
      ? this.generateSlug(data.slug)
      : this.generateSlug(data.name);
    const existingProduct = await this.prisma.product.findUnique({
      where: { slug },
    });
    if (existingProduct) {
      throw new AppError(`Product with slug '${slug}' already exists`, 409);
    }

    // 5. Validate Variants if provided
    if (data.variants && data.variants.length > 0) {
      const sizeIds = Array.from(new Set(data.variants.map((v) => v.sizeId)));
      const colorIds = Array.from(new Set(data.variants.map((v) => v.colorId)));

      const [foundSizes, foundColors] = await Promise.all([
        this.prisma.size.findMany({ where: { id: { in: sizeIds } } }),
        this.prisma.color.findMany({ where: { id: { in: colorIds } } }),
      ]);

      if (foundSizes.length !== sizeIds.length) {
        throw new AppError('One or more invalid Size IDs provided', 400);
      }
      if (foundColors.length !== colorIds.length) {
        throw new AppError('One or more invalid Color IDs provided', 400);
      }

      // Check unique SKUs
      const skus = data.variants.map((v) => v.sku);
      if (new Set(skus).size !== skus.length) {
        throw new AppError('Duplicate SKUs found in variant payload', 400);
      }

      const existingSku = await this.prisma.productVariant.findFirst({
        where: { sku: { in: skus } },
      });
      if (existingSku) {
        throw new AppError(
          `Variant SKU '${existingSku.sku}' already exists in database`,
          409,
        );
      }
    }

    // 6. Atomic creation with Prisma Transaction
    const resultProduct = await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: data.name,
          slug,
          description: data.description ?? null,
          status: data.status ?? 'DRAFT',
          categoryId: data.categoryId,
          brandId: data.brandId ?? null,
          fabricId: data.fabricId ?? null,
        },
      });

      // Create Variants
      if (data.variants && data.variants.length > 0) {
        await tx.productVariant.createMany({
          data: data.variants.map((v) => ({
            productId: product.id,
            sku: v.sku,
            barcode: v.barcode ?? null,
            price: v.price,
            comparePrice: v.comparePrice ?? null,
            costPrice: v.costPrice ?? null,
            isActive: v.isActive ?? true,
            sizeId: v.sizeId,
            colorId: v.colorId,
          })),
        });
      }

      // Create Images
      if (data.images && data.images.length > 0) {
        await tx.productImage.createMany({
          data: data.images.map((img) => ({
            productId: product.id,
            url: img.url,
            altText: img.altText ?? null,
            sortOrder: img.sortOrder ?? 0,
            isPrimary: img.isPrimary ?? false,
            variantId: img.variantId ?? null,
          })),
        });
      }

      const createdProduct = await tx.product.findUnique({
        where: { id: product.id },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true } },
          fabric: { select: { id: true, name: true, slug: true } },
          variants: {
            include: {
              size: { select: { id: true, name: true, code: true } },
              color: { select: { id: true, name: true, hex: true } },
            },
          },
          images: true,
        },
      });

      if (!createdProduct) {
        throw new AppError('Failed to retrieve created product', 500);
      }

      return createdProduct;
    });

    await this.invalidateProductCache();
    return resultProduct;
  }

  async getAllProducts(query: ZCTProductQuery) {
    const cacheKey = `products:query:${JSON.stringify(query)}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {
      // Fallthrough
    }

    const {
      page = 1,
      limit = 20,
      search,
      categoryId,
      brandId,
      fabricId,
      status,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      ...(categoryId ? { categoryId } : {}),
      ...(brandId ? { brandId } : {}),
      ...(fabricId ? { fabricId } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? {
            variants: {
              some: {
                price: {
                  ...(minPrice !== undefined ? { gte: minPrice } : {}),
                  ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
                },
              },
            },
          }
        : {}),
    };

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true } },
          fabric: { select: { id: true, name: true, slug: true } },
          variants: {
            include: {
              size: { select: { id: true, name: true, code: true } },
              color: { select: { id: true, name: true, hex: true } },
            },
          },
          images: { orderBy: { sortOrder: 'asc' } },
          _count: { select: { variants: true, images: true } },
        },
      }),
    ]);

    const result = {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    await this.redis
      .set(cacheKey, JSON.stringify(result), 'EX', 300)
      .catch(() => null);
    return result;
  }

  async getProductById(id: string) {
    const cacheKey = `product:id:${id}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {
      // Fallthrough
    }

    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        fabric: true,
        variants: {
          include: {
            size: true,
            color: true,
            images: true,
          },
        },
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    await this.redis
      .set(cacheKey, JSON.stringify(product), 'EX', 3600)
      .catch(() => null);
    return product;
  }

  async getProductBySlug(slug: string) {
    const cacheKey = `product:slug:${slug}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {
      // Fallthrough
    }

    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        brand: true,
        fabric: true,
        variants: {
          include: {
            size: true,
            color: true,
            images: true,
          },
        },
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    await this.redis
      .set(cacheKey, JSON.stringify(product), 'EX', 3600)
      .catch(() => null);
    return product;
  }

  async updateProduct(id: string, data: ZCTUpdateProduct) {
    const oldProduct = await this.getProductById(id);

    const slug = data.slug
      ? this.generateSlug(data.slug)
      : data.name
        ? this.generateSlug(data.name)
        : undefined;

    if (slug) {
      const existing = await this.prisma.product.findFirst({
        where: { slug, id: { not: id } },
      });
      if (existing) {
        throw new AppError(`Product slug '${slug}' is already in use`, 409);
      }
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...data,
        ...(slug ? { slug } : {}),
      },
      include: {
        category: true,
        brand: true,
        fabric: true,
        variants: true,
        images: true,
      },
    });

    await this.invalidateProductCache(id, oldProduct.slug);
    if (slug && slug !== oldProduct.slug) {
      await this.invalidateProductCache(id, slug);
    }
    return updated;
  }

  async deleteProduct(id: string) {
    const product = await this.getProductById(id);
    const result = await this.prisma.product.delete({ where: { id } });
    await this.invalidateProductCache(id, product.slug);
    return result;
  }

  // --- Variant Direct Operations ---
  async createVariant(productId: string, data: ZCTProductVariant) {
    const product = await this.getProductById(productId);

    // Check size & color
    const [size, color] = await Promise.all([
      this.prisma.size.findUnique({ where: { id: data.sizeId } }),
      this.prisma.color.findUnique({ where: { id: data.colorId } }),
    ]);

    if (!size) throw new AppError('Size not found', 404);
    if (!color) throw new AppError('Color not found', 404);

    // Check SKU
    const existingSku = await this.prisma.productVariant.findUnique({
      where: { sku: data.sku },
    });
    if (existingSku) {
      throw new AppError(`SKU '${data.sku}' is already in use`, 409);
    }

    // Check unique (productId, sizeId, colorId)
    const existingCombination = await this.prisma.productVariant.findUnique({
      where: {
        productId_sizeId_colorId: {
          productId,
          sizeId: data.sizeId,
          colorId: data.colorId,
        },
      },
    });
    if (existingCombination) {
      throw new AppError(
        'A variant with this size and color combination already exists for this product',
        409,
      );
    }

    const variant = await this.prisma.productVariant.create({
      data: {
        productId,
        sku: data.sku,
        barcode: data.barcode ?? null,
        price: data.price,
        comparePrice: data.comparePrice ?? null,
        costPrice: data.costPrice ?? null,
        isActive: data.isActive ?? true,
        sizeId: data.sizeId,
        colorId: data.colorId,
      },
      include: {
        size: true,
        color: true,
      },
    });

    await this.invalidateProductCache(productId, product.slug);
    return variant;
  }

  async updateVariant(variantId: string, data: ZCTUpdateProductVariant) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });
    if (!variant) {
      throw new AppError('Product variant not found', 404);
    }

    if (data.sku && data.sku !== variant.sku) {
      const existingSku = await this.prisma.productVariant.findUnique({
        where: { sku: data.sku },
      });
      if (existingSku) {
        throw new AppError(`SKU '${data.sku}' is already in use`, 409);
      }
    }

    const updated = await this.prisma.productVariant.update({
      where: { id: variantId },
      data,
      include: { size: true, color: true },
    });

    await this.invalidateProductCache(variant.productId);
    return updated;
  }

  async deleteVariant(variantId: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });
    if (!variant) {
      throw new AppError('Product variant not found', 404);
    }
    const deleted = await this.prisma.productVariant.delete({
      where: { id: variantId },
    });
    await this.invalidateProductCache(variant.productId);
    return deleted;
  }
}
