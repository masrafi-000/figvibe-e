import { RedisDatabase } from '../common/redis';
import { Database } from '../db/prisma';
import { AuditController } from '../modules/audit/audit.controller';
import { AuditRouter } from '../modules/audit/audit.route';
import { AuditService } from '../modules/audit/audit.service';
import { AuthController } from '../modules/auth/auth.controller';
import { AuthRouter } from '../modules/auth/auth.route';
import { AuthService } from '../modules/auth/auth.service';
import { HealthController } from '../modules/health/health.controller';
import { HealthRouter } from '../modules/health/health.route';
import { UserController } from '../modules/user/user.controller';
import { UserRouter } from '../modules/user/user.route';
import { UserService } from '../modules/user/user.service';

// Database connection
const database = new Database();

// Redis connection
const redis = new RedisDatabase();

// Audit module
const auditService = new AuditService(database);
const auditController = new AuditController(auditService);
const auditRouter = new AuditRouter(auditController);

// Health module
const healthController = new HealthController(database, redis);
const healthRouter = new HealthRouter(healthController);

// Auth module
const authService = new AuthService(database);
const authController = new AuthController(authService, auditService);
const authRouter = new AuthRouter(authController);

// User module
const userService = new UserService(database);
const userController = new UserController(userService, auditService);
const userRouter = new UserRouter(userController);

// Export container
export const container = {
  database,
  redis,
  healthRouter,
  authRouter,
  authService,
  authController,
  userRouter,
  userService,
  userController,
  auditRouter,
  auditService,
  auditController,
};
