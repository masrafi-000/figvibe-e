import { Database } from '../db/prisma';
import { HealthController } from '../modules/health/health.controller';
import { HealthRouter } from '../modules/health/health.route';

const database = new Database();

const healthController = new HealthController(database);

const healthRouter = new HealthRouter(healthController);

export const container = {
  database,

  healthRouter,
};
