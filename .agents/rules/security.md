# Security & Authorization Standards

This document establishes the security policies, authentication mechanisms, and authorization standards for `figvibe-e`.

## 1. Authentication Standards
* **Dual Authentication Pattern:**
  - **API Clients & Mobile:** Read Bearer token from `Authorization: Bearer <token>`.
  - **Web Browsers:** Read `access_token` and `refresh_token` from HttpOnly, Secure, SameSite cookies.
* **Token Rotation & Lifespans:**
  - Access tokens have a short lifespan (`15m`).
  - Refresh tokens have a longer lifespan (`7d`) stored in the database `AuthSession` model with device/IP tracking.
* **Passwords:**
  - Hashes must use bcrypt or Argon2 with `SALT_ROUNDS` from environment configuration.
  - Plaintext passwords must never appear in log payloads, error messages, or unhashed database columns.

## 2. Granular Role-Based Access Control (RBAC)
* Access control is enforced at the route level via the `requirePermission` middleware.
* Permissions follow the syntax: `<resource>:<action>` (e.g., `user:create`, `order:update`, `inventory:adjust`).
* System roles (`SUPER_ADMIN`, `ADMIN`, `SALESMAN`, `CUSTOMER`) map to permission sets stored in PostgreSQL and cached in Redis.
* `SUPER_ADMIN` holds wildcard `*` permissions.
* **Cache Invalidation:** Any mutation to roles or permissions must call `PermissionCacheService.invalidateUser(userId)` or `invalidateRole(roleId)` immediately.

## 3. Input Sanitization & Attack Prevention
* **SQL Injection:** Avoid raw SQL `$queryRawUnsafe`. Use Prisma's parameterized queries (`$queryRaw` with template tags) and standard query builder methods.
* **Cross-Site Scripting (XSS):** Helmet headers are enabled globally.
* **Brute-Force & Denial-of-Service:**
  - Auth routes (`/api/v1/auth/*`) must have strict rate limiters (e.g., 5 requests per 15 minutes).
  - General routes use the global Redis rate limiter.
  - JSON payload size is strictly capped at `1mb`.

## 4. Secrets & Configuration
* Secrets must be loaded exclusively through `src/config/env.ts` validated via Zod.
* Under no circumstances may credentials, tokens, or private keys be hardcoded or logged.
