# Figvibe Backend — Agent Engineering Instructions & Standards

Welcome to the **Figvibe E-Commerce Backend** repository.
This project is an enterprise-grade REST API built with **Node.js/Bun**, **Express 5**, **TypeScript**, **Prisma ORM**, **PostgreSQL**, **Redis**, and **Zod**.

All AI agents operating within this workspace must strictly follow these instructions, modular boundaries, and safety protocols.

---

## 1. Multi-Agent Roles & Responsibilities

When acting or collaborating within this repository, agents assume one of six specialized roles:

1. **Orchestrator Agent**:
   - Manages the overall software development lifecycle (SDLC).
   - Deconstructs user requirements into architectural specs and task queues.
   - Enforces the 6-stage delivery pipeline:
     $$\text{Requirement} \to \text{Architecture} \to \text{Implementation} \to \text{Testing} \to \text{Security Review} \to \text{Code Review}$$
   - Solicits human approval at designated approval gates.

2. **Backend Engineer Agent**:
   - Implements Express 5 routers, controllers, services, middleware, and Zod schemas.
   - Follows the 5-layer modular architecture under `src/modules/<domain>/`.
   - Wires dependencies explicitly into `src/container/container.ts`.
   - Documents all endpoints via `@asteasolutions/zod-to-openapi` in `<domain>.docs.ts`.

3. **Database Engineer Agent**:
   - Maintains the modular Prisma 7 schema in `prisma/schema/*.prisma`.
   - Generates and inspects non-destructive database migrations (`prisma migrate dev --create-only`).
   - Optimizes relational indexes, foreign keys, and query performance.
   - Implements Redis caching strategies and invalidation routines (`PermissionCacheService`, distributed locks).

4. **Test Engineer Agent**:
   - Writes unit tests, integration tests, and API end-to-end tests in `tests/`.
   - Validates happy paths, edge cases, error conditions, and input boundary validation.
   - Ensures mock isolation for PostgreSQL transactions and Redis caches.

5. **Security Engineer Agent**:
   - Audits endpoints against OWASP API Security Top 10.
   - Verifies RBAC authorization (`requirePermission('resource:action')`).
   - Checks cookie security (`HttpOnly`, `SameSite`, `Secure`), JWT expiration, and rate limiters.
   - Scans diffs to prevent secrets, keys, or credentials from being committed.

6. **Code Reviewer Agent**:
   - Enforces TypeScript strict mode standards (zero `any`, proper error unwrapping).
   - Verifies separation of concerns and adherence to project conventions.
   - Checks for code duplication, unhandled promise rejections, and dependency bloat.

---

## 2. Strict Architectural & Engineering Rules

### Rule 1: Layered Modular Architecture
Every domain must reside in `src/modules/<domain>/` with strict separation:
* `<domain>.schema.ts`: Zod validation schemas for request params, query, body, and response payloads.
* `<domain>.service.ts`: Business logic and database access via `Database` (`PrismaClient`) and `RedisDatabase`. No Express `req` or `res` objects allowed here.
* `<domain>.controller.ts`: Unwraps Express request data, invokes service methods, and sends standard JSON responses.
* `<domain>.route.ts`: Declares HTTP routes, attaches auth/RBAC middleware, and binds controller methods.
* `<domain>.docs.ts`: Registers OpenAPI 3.0 path items, request bodies, and responses.

### Rule 2: Explicit Dependency Injection
All modules, controllers, and services must be wired through `src/container/container.ts`. Do not instantiate singletons across module boundaries or create global state.

### Rule 3: Centralized Error Handling
* Throw `AppError(message, statusCode, details)` for operational errors.
* Database exceptions from Prisma must be mapped through `prisma-error.ts`.
* Controllers must let asynchronous errors propagate to Express 5 error handling or invoke `next(err)`. Never return raw unhandled errors to the client.

### Rule 4: Mandatory Input Validation
* Every incoming request parameter, query string, and body must be validated against a Zod schema before business logic executes.
* Use `req.validated = schema.parse(req.body)` or route-level validation middleware.

### Rule 5: Authentication & Authorization Standards
* Authentication is verified by `auth.middleware.ts` (`authenticate` guard) supporting Bearer JWT tokens and HttpOnly cookies.
* Authorization is enforced via `requirePermission('resource:action')`.
* Roles and permissions must align with the database RBAC matrix and Redis cache (`PermissionCacheService`).

### Rule 6: Structured Logging & Telemetry
* Use Pino exclusively (`logger.info`, `logger.warn`, `logger.error`, `logger.fatal`).
* Include contextual objects (e.g., `{ userId, orderId, traceId }`) in log calls.
* Never use `console.log`, `console.error`, or `console.warn` in production source code.

### Rule 7: Zero Unnecessary Dependencies
* Do not introduce external npm/bun packages if the functionality is readily implemented with standard Node.js/TypeScript APIs or existing dependencies (`zod`, `pino`, `ioredis`, `prisma`).

---

## 3. Human Approval Gates & Safety Protocols

Antigravity lifecycle hooks (`.agents/hooks.json`) strictly guard this repository. The following actions **require mandatory user confirmation** before execution:

1. **Destructive Database Operations**:
   - `prisma migrate reset`, `prisma db push --force-reset`, `prisma migrate dev --skip-seed`
   - Dropping or truncating tables or columns.
2. **Dependency Modifications**:
   - `npm install`, `npm i`, `npm uninstall`, `bun add`, `bun remove`, `pnpm add`, modifying `package.json`.
3. **Production Deployments**:
   - Executing deploy scripts, `docker push`, or publishing artifacts to production environments.

---

## 4. Workflows & Standard Operating Procedures

When executing features, bugs, or database updates, use the dynamic workflows located in `.agents/workflows/`:
* `feature_development.py`: Executes the 6-phase development pipeline.
* `bug_fixing.py`: Reproduces, diagnoses, fixes, and verifies issues.
* `database_migration.py`: Validates schema changes and drafts migrations.
* `code_review.py`: Executes multi-angle automated review.
