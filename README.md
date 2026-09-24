# Figvibe — Production-Grade E-Commerce REST API

> A high-performance, modular, and type-safe REST API for the Figvibe E-commerce platform, built with Node.js/Bun, Express 5, TypeScript, Prisma, PostgreSQL, and Redis.

---

## 🌟 Key Features

- **⚡ Fast & Modern Runtime**: Built on TypeScript with Express 5 and strict type checks.
- **🔐 Dual Authentication**:
  - Bearer Token (JWT in `Authorization` header) for mobile/API clients.
  - HttpOnly secure cookies (`access_token`, `refresh_token`) for web clients.
  - Google OAuth 2.0 and Local email/password authentication strategies via Passport.
- **🛡️ Granular RBAC (Role-Based Access Control)**:
  - Resource-action permissions (`resource:action`).
  - Redis-backed distributed permission caching with instant cache invalidation on role changes.
  - Core system roles (`SUPER_ADMIN`, `ADMIN`, `SALESMAN`, `CUSTOMER`) with wildcard `*` support.
- **📦 Distributed Caching & Sessions**:
  - Redis 7 for user session management, rate limiting, and permission cache.
- **🚦 API Rate Limiting**:
  - Global limiter (`100 req / 15 min`) and strict Auth limiter (`5 req / 15 min`) backed by Redis.
- **📖 Self-Documenting OpenAPI 3.0 & Scalar UI**:
  - Interactive API docs available out-of-the-box at [`/docs`](http://localhost:5000/docs).
  - OpenAPI 3.0 JSON specification at [`/openapi.json`](http://localhost:5000/openapi.json).
- **🪵 Structured Observability**:
  - Fast structured logging with Pino & Pino-HTTP.
  - Graceful shutdown handling for PostgreSQL and Redis connections.

---

## 🛠️ Tech Stack

| Category               | Technology                                                                                                          | Description                                                |
| :--------------------- | :------------------------------------------------------------------------------------------------------------------ | :--------------------------------------------------------- |
| **Runtime & Language** | [Bun](https://bun.sh) / [Node.js](https://nodejs.org)                                                               | Modern JavaScript/TypeScript runtime                       |
| **Framework**          | [Express 5](https://expressjs.com)                                                                                  | Fast, unopinionated web framework                          |
| **Language**           | [TypeScript](https://www.typescriptlang.org)                                                                        | Static type safety and strict checking                     |
| **Database & ORM**     | [PostgreSQL](https://www.postgresql.org) + [Prisma](https://www.prisma.io)                                          | Relational database with Prisma ORM (`@prisma/adapter-pg`) |
| **Cache & Sessions**   | [Redis](https://redis.io) (`ioredis`, `connect-redis`)                                                              | Distributed in-memory data store                           |
| **Validation**         | [Zod](https://zod.dev)                                                                                              | Schema validation with runtime type inference              |
| **Authentication**     | [JWT](https://jwt.io) + [Passport.js](https://www.passportjs.org)                                                   | Token & session-based auth (Local & Google OAuth)          |
| **API Documentation**  | [Scalar](https://scalar.com) + [zod-to-openapi](https://github.com/asteasolutions/zod-to-openapi)                   | Interactive OpenAPI 3.0 documentation                      |
| **Security & Logging** | [Helmet](https://helmetjs.github.io), [Pino](https://getpino.io), [Bcrypt.js](https://github.com/dcodeIO/bcrypt.js) | HTTP headers, logging, and password hashing                |

---

## 📁 Project Structure

```text
figvibe-e/
├── .env.example                # Sample environment variables
├── docker-compose.yml          # Redis container setup
├── package.json                # Project dependencies and scripts
├── tsconfig.json               # TypeScript compiler configuration
├── prisma/
│   ├── schema/                 # Modular Prisma schemas
│   │   ├── enum.prisma         # System enums
│   │   ├── user.prisma         # User, Role, Permission, Session models
│   │   ├── product.prisma      # Product, Category, Brand models
│   │   └── order.prisma        # Order, Cart, Payment models
│   ├── migrations/             # Database migration history
│   └── seed.ts                 # Database seeder (Roles, Permissions, Super Admin)
├── docs/
│   ├── API_DOCUMENTATION.md    # Comprehensive REST API reference guide
│   └── README.md               # Docs index
└── src/
    ├── app.ts                  # Express application setup & middleware stack
    ├── server.ts               # Server entry point & graceful shutdown
    ├── common/
    │   ├── redis/              # Redis connection and health checks
    │   ├── services/           # PermissionCacheService (Redis RBAC cache)
    │   └── utils/              # AppError, JWT, Password utilities
    ├── config/
    │   ├── env.ts              # Zod-validated environment variables
    │   ├── docs.ts             # OpenAPI registry & Scalar configuration
    │   ├── logger.ts           # Pino logger configuration
    │   └── passport.ts         # Passport configuration
    ├── container/
    │   └── container.ts        # Dependency injection container
    ├── middleware/
    │   ├── auth.middleware.ts  # JWT authenticate & requirePermission guards
    │   ├── error.middleware.ts # Global error handler
    │   ├── not_found.middleware.ts
    │   └── rate_limiter.middleware.ts # Redis rate limiters
    ├── modules/
    │   ├── auth/               # Auth controller, service, routes, schemas, docs
    │   ├── health/             # Health check endpoints
    │   └── user/               # User, Role, and Permission management
    └── routes/
        └── index.ts            # Main API router (/api/v1)
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites

Ensure you have the following installed on your machine:

- **Node.js** (v20+) or **Bun** (v1.1+)
- **PostgreSQL** (v15+)
- **Docker** & **Docker Compose** (for Redis)

---

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/your-org/figvibe-e.git
cd figvibe-e

# Using Bun (Recommended)
bun install

# Or using NPM
npm install
```

---

### 3. Environment Variables Setup

Copy the example environment file and configure your values:

```bash
cp .env.example .env
```

Key environment configuration:

```env
NODE_ENV="development"
PORT=5000

# PostgreSQL Database Connection
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/figvibe?schema=public"

# Redis Connection
REDIS_URL="redis://localhost:6379"

# Security & Secrets
SALT_ROUNDS=10
JWT_ACCESS_SECRET="your_strong_jwt_access_secret_here"
JWT_REFRESH_SECRET="your_strong_jwt_refresh_secret_here"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
SESSION_SECRET="your_strong_session_secret_here"

# CORS & Frontend
CORS_ORIGIN="http://localhost:3000"
FRONTEND_URL="http://localhost:3000"

# Google OAuth (Optional)
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
GOOGLE_CALLBACK_URL="http://localhost:5000/api/v1/auth/google/callback"
```

---

### 4. Start Redis Container

Start the Redis server via Docker Compose:

```bash
docker compose up -d
```

Verify Redis is running:

```bash
docker ps
```

---

### 5. Database Setup & Seeding

Run Prisma migrations and seed the initial roles, permissions, and default Super Admin user:

```bash
# Push schema migrations to PostgreSQL
npx prisma db push

# (Optional) Generate Prisma Client
npx prisma generate

# Seed initial Roles, Permissions, and default Super Admin
npm run db:seed
```

#### Default Super Admin Credentials:

- **Email**: `smmasrafi01@gmail.com`
- **Password**: `admin@1234`
- **Role**: `SUPER_ADMIN` (Full wildcard permissions)

---

### 6. Running the Application

```bash
# Start development server with hot-reload
npm run dev

# Or with Bun
bun run dev
```

The server will be available at **`http://localhost:5000`**.

---

## 📜 Available NPM Scripts

| Script                  | Command                                 | Description                                 |
| :---------------------- | :-------------------------------------- | :------------------------------------------ |
| `npm run dev`           | `tsx watch src/server.ts`               | Start dev server with hot-reload            |
| `npm run build`         | `tsc`                                   | Compile TypeScript to JavaScript in `/dist` |
| `npm start`             | `node dist/server.js`                   | Run compiled production build               |
| `npm run typecheck`     | `tsc --noEmit`                          | Check types across the entire workspace     |
| `npm run db:seed`       | `tsx prisma/seed.ts`                    | Seed roles, permissions, and super admin    |
| `npm run docs:generate` | `tsx src/scripts/openapi.collection.ts` | Generate `openapi.json` collection          |
| `npm run format`        | `prettier --write .`                    | Format codebase with Prettier               |
| `npm run format:check`  | `prettier --check .`                    | Check code formatting                       |

---

## 📖 API Documentation & Testing

### Interactive Scalar UI

Visit [`http://localhost:5000/docs`](http://localhost:5000/docs) in your browser when the server is running.

### Testing Protected Routes:

1. Send `POST /api/v1/auth/login` with your credentials (`smmasrafi01@gmail.com` / `admin@1234`).
2. Copy the `accessToken` from the response.
3. In the `/docs` UI, click the **Authorize / Security** button and enter `Bearer <accessToken>`.
4. Test protected endpoints directly from the interface.

Detailed route specifications, use cases, and request/response payloads are documented in:
📄 [**`docs/API_DOCUMENTATION.md`**](./docs/API_DOCUMENTATION.md)

---

## 🛡️ Role-Based Access Control (RBAC) Matrix

| Resource    | Action                               | Super Admin |    Admin    |          Salesman          |          Customer          |
| :---------- | :----------------------------------- | :---------: | :---------: | :------------------------: | :------------------------: |
| `user`      | `read`, `create`, `update`, `delete` |     ✅      |     ✅      |             ❌             |             ❌             |
| `role`      | `read`, `update`, `delete`           |     ✅      | `read` only |             ❌             |             ❌             |
| `product`   | `read`, `create`, `update`, `delete` |     ✅      |     ✅      |        `read` only         |        `read` only         |
| `category`  | `read`, `create`, `update`, `delete` |     ✅      |     ✅      |        `read` only         |        `read` only         |
| `order`     | `read`, `create`, `update`, `delete` |     ✅      |     ✅      | `read`, `create`, `update` | `read`, `create`, `cancel` |
| `inventory` | `read`, `update`, `adjust`           |     ✅      |     ✅      |        `read` only         |             ❌             |

---

## 📄 License

This project is licensed under the MIT License.
