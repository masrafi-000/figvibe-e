import { logger } from '../../config/logger';
import { prisma } from '../../db';
import { redis } from '../redis';

export class PermissionCacheService {
  /**
   * Redis key format:
   * permissions:user:{userId}
   */
  private readonly CACHE_PREFIX = 'permissions:user:';

  /**
   * Permissions are cached for 1 hour.
   */
  private readonly CACHE_TTL_SECONDS = 60 * 60;

  // Builds the Redis key used to store a user's permission,
  private getCacheKey(userId: string): string {
    return `${this.CACHE_PREFIX}${userId}`;
  }

  /**
   * Get all permission assigned to a user.
   *
   * Flow:
   *  1. Try Redis first.
   *  2. If cache miss, load Permissions from PostgreSQL
   *  3. Cache the result in Redis.
   *
   */
  async getUserPermissions(userId: string): Promise<Set<string>> {
    const cacheKey = this.getCacheKey(userId);

    // Try Redis cache first
    try {
      const cachedPermissions = await redis.smembers(cacheKey);

      if (cachedPermissions.length > 0) {
        return new Set(cachedPermissions);
      }
    } catch (error) {
      /**
       * Redis failure should not break authentication.
       * Fall back to PostgreSQL instead.
       */

      logger.warn(
        { err: error, userId },
        'Failed to read permission from Redis; falling back to database',
      );
    }

    // Cache miss: laod permission from PostgreSQL
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },

        select: {
          role: {
            select: {
              name: true,
              // Role -> RolePermission -> Permission
              permission: {
                select: {
                  permission: {
                    select: {
                      resource: true,
                      action: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // User dose not exist or has no role.
      if (!user?.role) {
        return new Set();
      }

      const permissions: string[] = [];

      // Add global permission for SUPER_ADMIN
      if (user.role.name === 'SUPER_ADMIN') {
        permissions.push('*');
      }

      /**
       * Convert database permissions to resource:action
       */
      for (const rolePermission of user.role.permission) {
        const permission = rolePermission.permission;

        if (!permission) {
          continue;
        }

        permissions.push(`${permission.resource}:${permission.action}`);
      }

      const permissionSet = new Set(permissions);

      /**
       * Cache permissions in Redis
       */
      if (permissionSet.size > 0) {
        try {
          const pipeline = redis.pipeline();

          pipeline.del(cacheKey);
          pipeline.sadd(cacheKey, ...permissionSet);
          pipeline.expire(cacheKey, this.CACHE_TTL_SECONDS);

          await pipeline.exec();
        } catch (error) {
          logger.warn(
            { err: error, userId },
            'Failed to cache user permissions in Redis',
          );
        }
      }

      return permissionSet;
    } catch (error) {
      logger.error(
        { err: error, userId },
        'Failed to load user permissions from database',
      );

      return new Set();
    }
  }

  /**
   * Remove one user's permission cache.
   *
   * Call this when:
   *  - User's role changes
   *  - User's permission are changed
   *  - User is deactivated/re-activated
   *
   */

  async invalidateUser(userId: string): Promise<void> {
    const cacheKey = this.getCacheKey(userId);

    try {
      await redis.del(cacheKey);
    } catch (error) {
      logger.warn(
        { err: error, userId },
        'Failed to invalidate user permission cache',
      );
    }
  }

  /**
   * Remove all user permission caches.
   */
  async invalidateAll(): Promise<void> {
    let cursor = '0';

    try {
      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          'MATCH',
          `${this.CACHE_PREFIX}`,
          'COUNT',
          100,
        );

        cursor = nextCursor;

        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } while (cursor !== '0');
    } catch (error) {
      logger.warn(
        { err: error },
        'Failed to invalidate all user permission caches',
      );
    }
  }
}

export const permissionCache = new PermissionCacheService();
