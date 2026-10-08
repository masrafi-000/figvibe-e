import { RedisDatabase } from '../common/redis';
import { Database } from '../db/prisma';
import { AuditController } from '../modules/audit/audit.controller';
import { AuditRouter } from '../modules/audit/audit.route';
import { AuditService } from '../modules/audit/audit.service';
import { AuthController } from '../modules/auth/auth.controller';
import { AuthRouter } from '../modules/auth/auth.route';
import { AuthService } from '../modules/auth/auth.service';
import { BrandController } from '../modules/brand/brand.controller';
import { BrandRouter } from '../modules/brand/brand.route';
import { BrandService } from '../modules/brand/brand.service';
import { CategoryController } from '../modules/category/category.controller';
import { CategoryRouter } from '../modules/category/category.route';
import { CategoryService } from '../modules/category/category.service';
import { ColorController } from '../modules/color/color.controller';
import { ColorRouter } from '../modules/color/color.route';
import { ColorService } from '../modules/color/color.service';
import { FabricController } from '../modules/fabric/fabric.controller';
import { FabricRouter } from '../modules/fabric/fabric.route';
import { FabricService } from '../modules/fabric/fabric.service';
import { HealthController } from '../modules/health/health.controller';
import { HealthRouter } from '../modules/health/health.route';
import { ProductController } from '../modules/product/product.controller';
import { ProductRouter } from '../modules/product/product.route';
import { ProductService } from '../modules/product/product.service';
import { SizeController } from '../modules/size/size.controller';
import { SizeRouter } from '../modules/size/size.route';
import { SizeService } from '../modules/size/size.service';
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

// Category module
const categoryService = new CategoryService(database);
const categoryController = new CategoryController(
  categoryService,
  auditService,
);
const categoryRouter = new CategoryRouter(categoryController);

// Fabric module
const fabricService = new FabricService(database);
const fabricController = new FabricController(fabricService, auditService);
const fabricRouter = new FabricRouter(fabricController);

// Brand module
const brandService = new BrandService(database);
const brandController = new BrandController(brandService, auditService);
const brandRouter = new BrandRouter(brandController);

// Size module
const sizeService = new SizeService(database, redis);
const sizeController = new SizeController(sizeService, auditService);
const sizeRouter = new SizeRouter(sizeController);

// Color module
const colorService = new ColorService(database, redis);
const colorController = new ColorController(colorService, auditService);
const colorRouter = new ColorRouter(colorController);

// Product module
const productService = new ProductService(database, redis);
const productController = new ProductController(productService, auditService);
const productRouter = new ProductRouter(productController);

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
  categoryRouter,
  categoryService,
  categoryController,
  fabricRouter,
  fabricService,
  fabricController,
  brandRouter,
  brandService,
  brandController,
  sizeRouter,
  sizeService,
  sizeController,
  colorRouter,
  colorService,
  colorController,
  productRouter,
  productService,
  productController,
};
