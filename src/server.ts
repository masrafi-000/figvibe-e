import app from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";

const server = app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT}`);
});

const shutdown = async (signal: string) => {
  logger.info(`${signal} received. Shutting down...`);

  server.close(async () => {
    // db disconnect

    logger.info("Server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("uncaughtException", (error) => {
  logger.fatal(error, "Uncaught exception");

  process.exit(1);
});

process.on("unhandledRejection", (error) => {
  logger.fatal(error, "Unhandled rejection");

  process.exit(1);
});
