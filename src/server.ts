import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { database } from './db';

const startServer = async (): Promise<void> => {
  try {
    logger.info('Starting application...');

    await database.connect();

    const server = app.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT}`);
    });

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received.Starting graceful shutdown...`);

      try {
        if (server) {
          await new Promise<void>((resolve, reject) => {
            server?.close((error) => {
              if (error) {
                reject(error);
                return;
              }

              resolve();
            });
          });

          logger.info('Http server closed');
        }

        await database.disconnect();

        logger.info('Graceful shutdown completed');

        process.exit(0);
      } catch (error) {
        logger.fatal({ error }, 'Graceful shutdown failed');

        process.exit(1);
      }
    };

    process.on('SIGTERM', () => {
      void shutdown('SIGTERM');
    });

    process.on('SIGINT', () => {
      void shutdown('SIGINT');
    });
  } catch (error) {
    logger.fatal({ error }, 'Failed to start server');
    process.exit(1);
  }
};

process.on('uncaughtException', (error) => {
  logger.fatal(error, 'Uncaught exception');

  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logger.fatal(error, 'Unhandled rejection');

  process.exit(1);
});

void startServer();
