import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { PrismaClient, Prisma } from '../generated/prisma/client';

export class Database {
  private readonly prisma: PrismaClient;

  constructor() {
    const adapter = new PrismaPg({
      connectionString: env.DATABASE_URL,
    });

    this.prisma = new PrismaClient({
      adapter,
      log: [
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ],
    });

    this.setupLogging();
  }

  private setupLogging(): void {
    (
      this.prisma.$on as unknown as (
        event: 'error',
        callback: (event: Prisma.LogEvent) => void,
      ) => void
    )('error', (event: Prisma.LogEvent) => {
      logger.error(
        {
          target: event.target,
          message: event.message,
        },
        'Prisma error',
      );
    });

    (
      this.prisma.$on as unknown as (
        event: 'warn',
        callback: (event: Prisma.LogEvent) => void,
      ) => void
    )('warn', (event: Prisma.LogEvent) => {
      logger.warn(
        {
          target: event.target,
          message: event.message,
        },
        'Prisma warning',
      );
    });
  }

  get client(): PrismaClient {
    return this.prisma;
  }

  async connect(): Promise<void> {
    try {
      await this.prisma.$connect();

      logger.info('Database connected successfully');
    } catch (error) {
      logger.fatal({ error }, 'Failed to connect to database');

      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();

      logger.info('Database disconnected successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to disconnect from database');

      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error({ error }, 'Database health check failed');

      return false;
    }
  }
}
