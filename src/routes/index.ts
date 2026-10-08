import { Router } from 'express';
import { container } from '../container/container';

const router = Router();

router.use('/auth', container.authRouter.router);
router.use('/users', container.userRouter.router);
router.use('/audit-logs', container.auditRouter.router);
router.use('/categories', container.categoryRouter.router);
router.use('/fabrics', container.fabricRouter.router);
router.use('/brands', container.brandRouter.router);
router.use('/products', container.productRouter.router);

export { router as apiRouter };
