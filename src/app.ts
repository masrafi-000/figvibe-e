import { apiReference } from '@scalar/express-api-reference';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { generateOpenAPIDocument } from './config/docs';
import { logger } from './config/logger';
import { container } from './container/container';
import { errorMiddleware } from './middleware/error.middleware';
import { notFoundMiddleware } from './middleware/not_found.middleware';
import { apiRouter } from './routes';

const app = express();

app.disable('x-powered-by');

app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({ origin: '*', credentials: true }));

app.use(express.json({ limit: '1mb' }));

app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use(cookieParser());

app.use(
  pinoHttp({
    logger,
    serializers: {
      req: (req: Request) => ({
        method: req.method,
        url: req.url,
      }),
      res: (res: Response) => ({
        statusCode: res.statusCode,
      }),
    },
  }),
);

app.use('/health', container.healthRouter.router);

app.get('/openapi.json', (_req: Request, res: Response) => {
  res.json(generateOpenAPIDocument());
});

app.use(
  '/docs',
  apiReference({
    spec: {
      url: '/openapi.json',
    },
  }),
);

app.use('/api/v1', apiRouter);

app.use(notFoundMiddleware);

app.use(errorMiddleware);

export default app;
