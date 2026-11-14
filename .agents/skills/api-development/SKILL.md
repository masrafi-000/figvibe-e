---
name: api-development
description: >-
  Use this skill when developing, testing, or updating REST API endpoints in Figvibe.
  Covers Express 5 async handlers, Zod schema validation, and OpenAPI 3.0 documentation.
---

# API Development Skill

This skill guides the implementation of type-safe, validated REST API endpoints with automated OpenAPI documentation and error handling in Express 5.

## 1. API Route Conventions

* All API routes must be registered under `/api/v1` via `src/routes/index.ts`.
* Route paths must follow RESTful naming conventions:
  - `GET /api/v1/items` (List items, paginated)
  - `POST /api/v1/items` (Create new item)
  - `GET /api/v1/items/:id` (Get single item)
  - `PATCH /api/v1/items/:id` (Partial update)
  - `DELETE /api/v1/items/:id` (Soft delete / remove)

## 2. Input Validation Pattern

Every endpoint taking parameters or payloads must validate input against a Zod schema:

```typescript
import { z } from 'zod';

export const getItemParamsSchema = z.object({
  id: z.string().uuid({ message: 'Invalid item ID format' }),
});

export const updateItemBodySchema = z.object({
  name: z.string().min(1).optional(),
  price: z.number().positive().optional(),
});
```

In the controller:
```typescript
const { id } = getItemParamsSchema.parse(req.params);
const body = updateItemBodySchema.parse(req.body);
```

## 3. OpenAPI 3.0 Documentation (`<domain>.docs.ts`)

Every endpoint must register its OpenAPI contract using `@asteasolutions/zod-to-openapi`:

```typescript
import { registry } from '../../config/docs';
import { z } from 'zod';
import { createItemSchema } from './item.schema';

registry.registerPath({
  method: 'post',
  path: '/api/v1/items',
  summary: 'Create a new item',
  tags: ['Items'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: createItemSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Item created successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.any(),
          }),
        },
      },
    },
    400: { description: 'Validation failed' },
    401: { description: 'Unauthorized' },
    403: { description: 'Forbidden' },
  },
});
```

## 4. Response Format Standard

All controller responses must adhere to a consistent JSON structure:

```json
{
  "success": true,
  "message": "Optional human-readable confirmation",
  "data": { ... }
}
```

For paginated lists:
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```
