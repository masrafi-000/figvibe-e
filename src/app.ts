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
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { env } from './config/env';
import passport from './config/passport';
import { redis } from './common/redis';

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

app.set("trust proxy", 1);

app.use(session({
  store: new RedisStore({
    client: redis,
    prefix: "session"
  }),

  secret: env.SESSION_SECRET!,

  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "lax" : "lax",

    maxAge: 1000 * 60 * 60* 24 *7
  }
}))

app.use(passport.initialize())
app.use(passport.session())

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
