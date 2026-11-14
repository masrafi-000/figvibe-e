---
name: backend-architecture
description: >-
  Use this skill when designing, scaffolding, or refactoring modular backend components in Figvibe.
  Covers the 5-layer architecture (schema, service, controller, route, docs) and container wiring.
---

# Backend Architecture Skill

This skill guides agents through designing and structuring backend modules in the Figvibe e-commerce platform according to the 5-layer modular architecture.

## 1. Modular Directory Layout

When introducing a new domain feature or refactoring an existing one, create a dedicated folder under `src/modules/<domain>/`:

```text
src/modules/<domain>/
├── <domain>.schema.ts      # Zod validation schemas & TypeScript input types
├── <domain>.service.ts     # Business logic & data access methods
├── <domain>.controller.ts  # Express request handlers & HTTP responses
├── <domain>.route.ts       # Express router definition & middleware bindings
└── <domain>.docs.ts        # OpenAPI 3.0 path & schema documentation
```

## 2. Implementation Steps

### Step 1: Define Schemas (`<domain>.schema.ts`)
* Define request payload validation using Zod.
* Provide schemas for creation, updates, and querying.
* Export TypeScript types with `z.infer`.

```typescript
import { z } from 'zod';

export const createItemSchema = z.object({
  name: z.string().min(2).max(100),
  price: z.number().positive(),
  description: z.string().optional(),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
```

### Step 2: Implement Service (`<domain>.service.ts`)
* Receive `Database` and optional `RedisDatabase` in the constructor.
* Keep business logic pure; do not import Express `Request` or `Response`.
* Throw `AppError` on invariant violations.

```typescript
import { Database } from '../../db/prisma';
import { AppError } from '../../common/utils/AppError';
import type { CreateItemInput } from './item.schema';

export class ItemService {
  constructor(private readonly db: Database) {}

  async createItem(input: CreateItemInput) {
    return this.db.client.item.create({ data: input });
  }

  async getItemById(id: string) {
    const item = await this.db.client.item.findUnique({ where: { id } });
    if (!item) {
      throw new AppError('Item not found', 404);
    }
    return item;
  }
}
```

### Step 3: Implement Controller (`<domain>.controller.ts`)
* Inject the service and optional `AuditService`.
* Extract data from `req.body`, `req.params`, `req.query`.
* Send structured JSON responses.

```typescript
import type { Request, Response, NextFunction } from 'express';
import { ItemService } from './item.service';

export class ItemController {
  constructor(private readonly itemService: ItemService) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.itemService.createItem(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };
}
```

### Step 4: Implement Route (`<domain>.route.ts`)
* Instantiate `Router()`.
* Attach rate limiters, `authenticate`, and `requirePermission('<domain>:<action>')`.
* Bind controller methods.

```typescript
import { Router } from 'express';
import { ItemController } from './item.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';

export class ItemRouter {
  public readonly router = Router();

  constructor(private readonly controller: ItemController) {
    this.initRoutes();
  }

  private initRoutes() {
    this.router.post('/', authenticate, requirePermission('item:create'), this.controller.create);
  }
}
```

### Step 5: Wire Dependency Injection (`src/container/container.ts`)
* Instantiate the service, controller, and router inside `src/container/container.ts`.
* Mount the router inside `src/routes/index.ts`.
