---
name: automated-testing
description: >-
  Use this skill when writing, running, or fixing unit tests, integration tests,
  and API tests with Supertest and Vitest in Figvibe.
---

# Automated Testing Skill

This skill defines the testing methodology for the Figvibe backend, including unit testing of services and integration testing of Express routes with Supertest.

## 1. Test Organization

Place test files under the `tests/` directory mirroring the `src/` hierarchy:

```text
tests/
├── unit/
│   ├── auth.service.spec.ts
│   └── order.service.spec.ts
├── integration/
│   ├── health.route.spec.ts
│   ├── auth.route.spec.ts
│   └── order.route.spec.ts
└── helpers/
    ├── app.helper.ts
    └── db.helper.ts
```

## 2. Integration Testing with Supertest

Integration tests load the Express application instance (`src/app.ts`) and execute HTTP requests against test databases or mocked services.

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

describe('GET /health', () => {
  it('should return 200 and healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
  });
});
```

## 3. Unit Testing Services with Mocks

Unit tests isolate services by providing mock implementations of `Database` and `RedisDatabase`.

```typescript
import { describe, it, expect, vi } from 'vitest';
import { ItemService } from '../../src/modules/item/item.service';

describe('ItemService', () => {
  it('should create an item', async () => {
    const mockDb = {
      client: {
        item: {
          create: vi.fn().mockResolvedValue({ id: 'item-1', name: 'Test Item' }),
        },
      },
    } as any;

    const service = new ItemService(mockDb);
    const result = await service.createItem({ name: 'Test Item', price: 99 });

    expect(result.id).toBe('item-1');
    expect(mockDb.client.item.create).toHaveBeenCalledOnce();
  });
});
```

## 4. Test Execution Commands

* Run full test suite: `npm test`
* Run tests with coverage: `npm run test:coverage`
* Run specific test file: `npx vitest run tests/integration/health.route.spec.ts`
