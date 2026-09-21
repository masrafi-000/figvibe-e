import { Router } from 'express';
import { container } from '../container/container';

const router = Router();

router.use('/auth', container.authRouter.router);

export { router as apiRouter };

