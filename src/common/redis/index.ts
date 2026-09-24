import Redis from 'ioredis';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

export class RedisDatabase {
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 200, 2000);
        return delay;
      },
    });

    this.setupLogging();
  }

  private setupLogging(): void {
    this.redis.on('connect', () => {
      logger.debug(`Redis client initiating connection to ${env.REDIS_URL}`);
    });

    this.redis.on('ready', () => {
      logger.debug('Redis client ready for commands');
    });

    this.redis.on('error', (error) => {
      logger.error({ err: error }, 'Redis client error');
    });

    this.redis.on('close', () => {
      logger.warn('Redis connection closed');
    });

    this.redis.on('reconnecting', (time: number) => {
      logger.info({ delay: time }, 'Redis reconnecting...');
    });
  }

  get client(): Redis {
    return this.redis;
  }

  async connect(): Promise<void> {
    try {
      if (this.redis.status === 'ready') {
        logger.info('Redis client successfully connected');
        return;
      }

      if (
        this.redis.status === 'connecting' ||
        this.redis.status === 'connect'
      ) {
        await new Promise<void>((resolve, reject) => {
          this.redis.once('ready', () => resolve());
          this.redis.once('error', (err) => reject(err));
        });
        logger.info('Redis client successfully connected');
        return;
      }

      if (this.redis.status === 'wait') {
        await this.redis.connect();
        logger.info('Redis client successfully connected');
      }
    } catch (error) {
      logger.error({ err: error }, 'Redis connection failed');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.redis.status !== 'end' && this.redis.status !== 'close') {
        await this.redis.quit();
        logger.info('Redis disconnected successfully');
      }
    } catch (error) {
      logger.error({ err: error }, 'Failed to disconnect from Redis');
      throw error;
    }
  }
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.redis.ping();
      return response === 'PONG';
    } catch (error) {
      logger.error({ error }, 'Redis health check failed');
      return false;
    }
  }
}

export const redis_database = new RedisDatabase();
export const redis = redis_database.client;
