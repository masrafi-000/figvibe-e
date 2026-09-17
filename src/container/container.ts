import { RedisDatabase } from '../common/redis';
import { Database } from '../db/prisma';
import { HealthController } from '../modules/health/health.controller';
import { HealthRouter } from '../modules/health/health.route';

const database = new Database();
const redis = new RedisDatabase();

const healthController = new HealthController(database, redis);

const healthRouter = new HealthRouter(healthController);

export const container = {
  database,
  redis,
  healthRouter,
};
