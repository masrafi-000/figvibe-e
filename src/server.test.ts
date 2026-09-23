import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import app from './app';
import { database } from './db';
import { redis_database } from './common/redis';

describe('Server initialization', () => {
  beforeAll(async () => {
    // Attempt to connect, but tests shouldn't hang if they fail,
    // real connections would need proper setup or mocking
    try {
        await database.connect();
        await redis_database.connect();
    } catch(_e) {
        // ignore connection errors during test
    }
  });

  afterAll(async () => {
    try {
        await database.disconnect();
        await redis_database.disconnect();
    } catch(_e) {
        // ignore
    }
  });

  it('app is defined', () => {
    expect(app).toBeDefined();
  });
});
