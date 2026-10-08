import { Prisma } from '../../generated/prisma/client';
import { AppError } from './AppError';

/**
 * Type guard to check if an error is a Prisma Unique Constraint Violation (P2002).
 */
export function isPrismaUniqueConstraintError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

/**
 * Type guard to check if an error is a Prisma Record Not Found Error (P2025).
 */
export function isPrismaNotFoundError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  );
}

/**
 * Type guard to check if an error is a Prisma Foreign Key Constraint Violation (P2003).
 */
export function isPrismaForeignKeyError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2003'
  );
}

/**
 * Extracts target field name(s) causing the Prisma P2002 unique constraint violation.
 */
export function getPrismaUniqueTarget(
  error: Prisma.PrismaClientKnownRequestError,
): string {
  const target = error.meta?.target;
  if (Array.isArray(target)) {
    return target.join(', ');
  }
  if (typeof target === 'string') {
    return target;
  }
  return 'field';
}

/**
 * Helper to check and convert Prisma unique constraint errors into user-friendly AppError (409 Conflict).
 * If the error is a P2002 violation, it throws an AppError with exact target field details.
 */
export function catchPrismaUniqueError(
  error: unknown,
  entityName = 'Record',
): void {
  if (isPrismaUniqueConstraintError(error)) {
    const target = getPrismaUniqueTarget(error);
    throw new AppError(`${entityName} with this ${target} already exists`, 409);
  }
}
