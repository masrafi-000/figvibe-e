import type { Request, Response } from 'express';
import { Database } from '../../db/prisma';
import type { RedisDatabase } from '../../common/redis';

export class HealthController {
  constructor(private readonly database: Database, private readonly redis: RedisDatabase) {}

  health = async (_req: Request, res: Response) => {
    const [databaseHealthy, redisHealthy] = await Promise.all([
      this.database.healthCheck(),
      this.redis.healthCheck(),
    ]);

    const isHealthy = databaseHealthy && redisHealthy;

    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      status: isHealthy ? 'healthy' : 'unhealthy',
      services: {
        database: databaseHealthy ? 'healthy' : 'unhealthy',
        redis: redisHealthy ? 'healthy' : 'unhealthy',
      },
    });
  };
}
