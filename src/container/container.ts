import { RedisDatabase } from '../common/redis';
import { Database } from '../db/prisma';
import { AuthController } from '../modules/auth/auth.controller';
import { AuthRouter } from '../modules/auth/auth.route';
import { AuthService } from '../modules/auth/auth.service';
import { HealthController } from '../modules/health/health.controller';
import { HealthRouter } from '../modules/health/health.route';

// Database connection
const database = new Database();

// Redis connection
const redis = new RedisDatabase();

// Health module
const healthController = new HealthController(database, redis);
const healthRouter = new HealthRouter(healthController);

// Auth module
const authService = new AuthService(database);
const authController = new AuthController(authService);
const authRouter = new AuthRouter(authController);

// Export container
export const container = {
  database,
  redis,
  healthRouter,
  authRouter,
  authService,
  authController,
};

