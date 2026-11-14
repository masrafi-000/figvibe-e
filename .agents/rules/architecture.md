# Architecture & Code Organization Guidelines

This document specifies the mandatory architectural principles for `figvibe-e`.

## 1. Directory Structure

```text
src/
├── app.ts                 # Express configuration, global middleware & router mounts
├── server.ts              # HTTP listener, lifecycle management & graceful shutdown
├── config/                # Environment variables, Pino logger, Passport, Prometheus metrics
├── container/             # Dependency injection container (IoC root)
├── common/                # Shared utilities, Redis client, BullMQ queues, mail services
│   ├── redis/             # Redis client and connection checks
│   ├── services/          # Shared domain services (PermissionCacheService, MailService)
│   ├── queue/             # BullMQ queue and worker definitions
│   └── utils/             # AppError, JWT, Password, Prisma error helpers
├── db/                    # Prisma database client wrapper with query logging & health checks
├── middleware/            # Express middleware (auth, rate limiting, error, not-found, metrics)
├── modules/               # Domain-driven feature modules
│   └── <module_name>/
│       ├── <name>.schema.ts      # Zod validation schemas
│       ├── <name>.service.ts     # Business logic & data access
│       ├── <name>.controller.ts  # HTTP handling & response formatting
│       ├── <name>.route.ts       # Express router & RBAC bindings
│       └── <name>.docs.ts        # OpenAPI 3.0 documentation
└── routes/
    └── index.ts           # Central API router (/api/v1)
```

## 2. Layered Responsibilities

### Route Layer (`<name>.route.ts`)
* Instantiates an Express `Router`.
* Applies rate limiters, authentication (`authenticate`), and authorization (`requirePermission`).
* Maps HTTP verbs and paths to controller methods.
* Exposes a router class with a `.router` getter for DI container injection.

### Controller Layer (`<name>.controller.ts`)
* Receives Express `req` and `res`.
* Extracts input from `req.body`, `req.params`, and `req.query`.
* Delegates all business operations to the injected service.
* Returns standard JSON responses with appropriate HTTP status codes (200, 201, 204).
* Catches unexpected exceptions and passes them to `next(err)`.

### Service Layer (`<name>.service.ts`)
* Encapsulates all domain and business rules.
* Interacts with `Database` (`PrismaClient`) and `RedisDatabase`.
* Never imports or uses Express request or response objects.
* Throws `AppError` when a business invariant is violated (e.g., entity not found, duplicate key, insufficient stock).

### Validation Layer (`<name>.schema.ts`)
* Defines Zod schemas for incoming requests:
  - `create<Entity>Schema`
  - `update<Entity>Schema`
  - `query<Entity>Schema`
* Exports inferred TypeScript types: `export type Create<Entity>Input = z.infer<typeof create<Entity>Schema>;`.

### Container Layer (`src/container/container.ts`)
* Instantiates services with their dependencies (e.g., `new UserService(database)`).
* Instantiates controllers with their required services.
* Instantiates routes with their controllers.
* Exports a single immutable `container` object used across the application.
