import { env } from '../../config/env';

export const redisConnection = {
  host: new URL(env.REDIS_URL).hostname || '127.0.0.1',
  port: Number(new URL(env.REDIS_URL).port) || 6379,
  maxRetriesPerRequest: null,
};
