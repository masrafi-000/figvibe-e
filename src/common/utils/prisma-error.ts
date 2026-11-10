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

/**
 * Type guard to check if an error is a Prisma Transaction Conflict or Deadlock (P2034)
 * or PostgreSQL serialization failure (40001 / deadlock).
 */
export function isPrismaTransactionConflictError(error: unknown): boolean {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2034'
  ) {
    return true;
  }

  if (
    error instanceof Error &&
    (error.message.includes('could not serialize access') ||
      error.message.includes('deadlock detected') ||
      (error as any).code === '40001' ||
      (error as any).code === '40P01')
  ) {
    return true;
  }

  return false;
}
