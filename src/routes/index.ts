import { Router } from 'express';
import { container } from '../container/container';

const router = Router();

router.use('/auth', container.authRouter.router);
router.use('/users', container.userRouter.router);

export { router as apiRouter };
