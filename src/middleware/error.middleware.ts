import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger';
import { Prisma } from '../generated/prisma/client';

export const errorMiddleware: ErrorRequestHandler = (
  error,
  req,
  res,
  _next,
) => {
  // Handle Zod Validation Errors
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.flatten().fieldErrors,
    });
    return;
  }

  // Handle Prisma Unique Constraint Violations (P2002)
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    const target = Array.isArray(error.meta?.target)
      ? error.meta?.target.join(', ')
      : 'field';
    res.status(409).json({
      success: false,
      message: `A record with this ${target} already exists`,
    });
    return;
  }

  const statusCode =
    typeof error?.statusCode === 'number' ? error.statusCode : 500;

  if (statusCode === 500) {
    logger.error(
      {
        err: error,
        method: req.method,
        url: req.originalUrl,
      },
      'Internal server error',
    );
  }

  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Internal server error' : error.message,
  });
};
