import { describe, it, expect } from 'vitest';
import { AppError } from '../../src/common/utils/AppError';

describe('AppError Utility', () => {
  it('should instantiate with default statusCode 500', () => {
    const error = new AppError('Internal failure');
    expect(error.message).toBe('Internal failure');
    expect(error.statusCode).toBe(500);
    expect(error.isOperational).toBe(true);
    expect(error).toBeInstanceOf(Error);
  });

  it('should instantiate with custom statusCode and operational flag', () => {
    const error = new AppError('Resource not found', 404);
    expect(error.message).toBe('Resource not found');
    expect(error.statusCode).toBe(404);
    expect(error.isOperational).toBe(true);
  });
});
