import rateLimit, {
  type IncrementResponse,
  MemoryStore,
  type Options,
  type Store,
} from 'express-rate-limit';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import { redis } from '../common/redis';
import { logger } from '../config/logger';

export class HybridFallbackStore implements Store {
  private readonly memoryStore = new MemoryStore();
  private readonly redisStore: RedisStore;

  private options!: Options;
  private windowMs = 15 * 60 * 1000;
  private fallbackUntil = 0;
  private fallbackActive = false;
  private redisInitialized = false;

  private readonly cooldownMs: number;

  constructor(
    public readonly prefix: string,
    cooldownMs?: number,
  ) {
    this.cooldownMs = cooldownMs ?? 10_000;

    this.redisStore = new RedisStore({
      sendCommand: async (
        command: string,
        ...args: string[]
      ): Promise<RedisReply> => {
        if (redis.status !== 'ready') {
          throw new Error('Redis client is not ready');
        }

        return (await redis.call(command, ...args)) as RedisReply;
      },
      prefix,
    });
  }

  init(options: Options): void {
    this.options = options;
    this.windowMs = options.windowMs;
    this.memoryStore.init(options);

    this.tryInitRedis();
  }

  private tryInitRedis(): void {
    if (this.redisInitialized || redis.status !== 'ready' || !this.options) {
      return;
    }

    try {
      void Promise.resolve(this.redisStore.init(this.options))
        .then(() => {
          this.redisInitialized = true;
        })
        .catch((err) => {
          this.activateFallback(err);
        });
    } catch (err) {
      this.activateFallback(err);
    }
  }

  private activateFallback(err: unknown): void {
    const isNewFailure = !this.fallbackActive;

    this.fallbackActive = true;
    this.fallbackUntil = Date.now() + this.cooldownMs;

    if (isNewFailure) {
      logger.warn(
        { err, prefix: this.prefix },
        'Rate limiter entered MemoryStore fallback',
      );
    }
  }

  private useMemoryStore(): boolean {
    if (redis.status !== 'ready') {
      this.activateFallback(new Error('Redis client is not ready'));
      return true;
    }

    if (!this.redisInitialized) {
      this.tryInitRedis();
      return true;
    }

    if (!this.fallbackActive) {
      return false;
    }

    if (Date.now() < this.fallbackUntil) {
      return true;
    }

    this.fallbackActive = false;
    logger.info(
      { prefix: this.prefix },
      'Rate limiter recovered and resumed Redis',
    );

    return false;
  }

  async increment(key: string): Promise<IncrementResponse> {
    if (this.useMemoryStore()) {
      return this.memoryStore.increment(key);
    }

    try {
      return await this.redisStore.increment(key);
    } catch (err) {
      this.activateFallback(err);
      return this.memoryStore.increment(key);
    }
  }

  async decrement(key: string): Promise<void> {
    if (this.useMemoryStore()) {
      return this.memoryStore.decrement(key);
    }

    try {
      await this.redisStore.decrement(key);
    } catch (err) {
      this.activateFallback(err);
      await this.memoryStore.decrement(key);
    }
  }

  async resetKey(key: string): Promise<void> {
    await this.memoryStore.resetKey(key);

    if (!this.useMemoryStore()) {
      try {
        await this.redisStore.resetKey(key);
      } catch (err) {
        this.activateFallback(err);
      }
    }
  }

  async resetAll(): Promise<void> {
    await this.memoryStore.resetAll?.();

    if (!this.useMemoryStore()) {
      try {
        await (this.redisStore as any).resetAll?.();
      } catch (err) {
        this.activateFallback(err);
      }
    }
  }
}

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: new HybridFallbackStore('rl:global:'),
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  requestPropertyName: 'authRateLimit',
  store: new HybridFallbackStore('rl:auth:'),
  message: {
    success: false,
    message:
      'Too many authentication attempts. Please try again after 15 minutes.',
  },
});
