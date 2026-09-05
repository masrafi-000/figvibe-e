import type { ErrorRequestHandler } from "express";
import { logger } from "../config/logger";

export const errorMiddleware: ErrorRequestHandler = (
  error,
  req,
  res,
  _next,
) => {
  logger.error(
    {
      error,
      method: req.method,
      url: req.originalUrl,
    },
    "Unhandled error",
  );

  const statusCode =
    typeof error?.statusCode === "number" ? error.statusCode : 500;

  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? "Internal server error" : error.message,
  });
};
