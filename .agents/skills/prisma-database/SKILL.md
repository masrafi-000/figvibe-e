---
name: prisma-database
description: >-
  Use this skill when modifying Prisma 7 schemas, generating database migrations,
  authoring seeds, or optimizing PostgreSQL queries and Redis caching in Figvibe.
---

# Prisma & Database Engineering Skill

This skill defines standard operating procedures for managing Prisma 7 multi-file schemas, PostgreSQL migrations, and Redis caching.

## 1. Multi-File Schema Structure

In Prisma 7, schemas are split across domain files inside `prisma/schema/`:
* `schema.prisma`: Generator (`prisma-client`) and datasource (`postgresql`).
* `enum.prisma`: Global enums (`UserRole`, `OrderStatus`, `PaymentStatus`).
* `user.prisma`: Users, roles, permissions, sessions, tokens.
* `products.prisma`: Products, categories, brands, variants, inventory.
* `order.prisma`: Orders, order items, carts, payments.
* `audit.prisma`: Audit logs and system events.

## 2. Safe Schema Migration Workflow

Never perform direct destructive database operations on shared environments.

### Step 1: Edit Schema
Update or add models within `prisma/schema/<domain>.prisma`. Always add descriptive `@map()` column names and indexes for foreign keys:

```prisma
model Item {
  id        String   @id @default(uuid()) @db.Uuid
  name      String   @db.VarChar(255)
  price     Decimal  @db.Decimal(10, 2)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("items")
  @@index([name])
}
```

### Step 2: Generate Migration SQL (Drafting)
Use the `--create-only` flag to generate migration SQL without applying it immediately:
```bash
npx prisma migrate dev --create-only --name <descriptive_migration_name>
```

### Step 3: Inspect Migration SQL
Read the newly generated SQL file in `prisma/migrations/<timestamp>_<name>/migration.sql`.
* Verify that no tables or columns are accidentally dropped without intent.
* Verify default values for non-nullable new columns.
* Verify index creation safety (`CREATE INDEX CONCURRENTLY` in high-throughput environments).

### Step 4: Apply Migration
Once reviewed and approved:
```bash
npx prisma migrate dev
```

### Step 5: Regenerate Client
The Prisma client is output to `src/generated/prisma`. Run:
```bash
npx prisma generate
```

## 3. Redis Invalidation Guidelines

When modifying entities cached in Redis:
* **Roles / Permissions:** Call `PermissionCacheService.invalidateUser(userId)` or `PermissionCacheService.invalidateRole(roleId)`.
* **Session Revocation:** Delete session keys prefixed with `session:` in Redis upon user logout or password reset.
