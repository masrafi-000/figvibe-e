import type { Request, Response } from 'express';
import { Database } from '../../db/prisma';

export class HealthController {
  constructor(private readonly database: Database) {}

  health = async (_req: Request, res: Response) => {
    const databaseHealthy = await this.database.healthCheck();

    if (!databaseHealthy) {
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        services: {
          database: 'unhealthy',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      status: 'healthy',
      services: {
        database: 'healthy',
      },
    });
  };
}
