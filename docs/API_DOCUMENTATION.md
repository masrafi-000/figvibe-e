# Figvibe E-Commerce API Documentation

Comprehensive technical reference for all routes, authentication mechanisms, validation schemas, input/output types, RBAC permissions, and usage examples.

---

## Table of Contents

1. [Architecture & System Overview](#1-architecture--system-overview)
2. [Authentication & Authorization Model](#2-authentication--authorization-model)
3. [Rate Limiting](#3-rate-limiting)
4. [Health Check API](#4-health-check-api)
5. [Authentication Module (`/api/v1/auth`)](#5-authentication-module-apiv1auth)
6. [User Management Module (`/api/v1/users`)](#6-user-management-module-apiv1users)
7. [Role Management Module (`/api/v1/users/roles`)](#7-role-management-module-apiv1usersroles)
8. [Permission Management Module (`/api/v1/users/permissions`)](#8-permission-management-module-apiv1userspermissions)
9. [Error Handling & Standard Responses](#9-error-handling--standard-responses)

---

## 1. Architecture & System Overview

- **Base URL**: `http://localhost:5000` (or `https://api.domain.com`)
- **API Prefix**: `/api/v1`
- **Interactive Documentation**: [`/docs`](http://localhost:5000/docs) (Scalar API Reference)
- **OpenAPI Spec**: [`/openapi.json`](http://localhost:5000/openapi.json)
- **Database**: PostgreSQL (Prisma ORM)
- **Cache / Sessions**: Redis (ioredis + connect-redis)

---

## 2. Authentication & Authorization Model

The API supports **Dual Authentication**:

1. **Bearer Token (JWT)**: Passed in HTTP header `Authorization: Bearer <accessToken>` (Used by mobile apps, external clients, Swagger/Scalar UI).
2. **HttpOnly Secure Cookies**: Automatically set on `login`, `register`, and `refresh` responses:
   - `access_token`: Short-lived JWT (15 minutes).
   - `refresh_token`: Long-lived JWT session token (7 days).

### Role-Based Access Control (RBAC)

- **Roles**: `SUPER_ADMIN`, `ADMIN`, `SALESMAN`, `CUSTOMER`, and custom roles.
- **Permissions Structure**: `resource:action` (e.g. `user:read`, `user:update`, `role:update`, `product:create`).
- **Super Admin Wildcard**: Users with `SUPER_ADMIN` automatically receive global wildcard (`*`) authorization.
- **Redis Permission Caching**: Permissions are cached in Redis (`permissions:user:<userId>`) with a 1-hour TTL and invalidated immediately upon role or permission mutations.

---

## 3. Rate Limiting

| Limiter                 | Target Routes                                 | Limits                 | Store                |
| :---------------------- | :-------------------------------------------- | :--------------------- | :------------------- |
| **Global Rate Limiter** | All routes                                    | 100 requests / 15 mins | Redis (`rl:global:`) |
| **Auth Rate Limiter**   | `/api/v1/auth/register`, `/api/v1/auth/login` | 5 requests / 15 mins   | Redis (`rl:auth:`)   |

---

## 4. Health Check API

### `GET /health`

- **Use Case**: Used by load balancers, container orchestrators, and monitoring services to verify backend and dependent service statuses.
- **Auth**: Public (`None`)
- **Responses**:
  - `200 OK`: All services are operational.
  - `503 Service Unavailable`: PostgreSQL or Redis is unreachable.

#### Response Output:

```json
{
  "success": true,
  "status": "healthy",
  "services": {
    "database": "healthy",
    "redis": "healthy"
  }
}
```

---

## 5. Authentication Module (`/api/v1/auth`)

### Summary Table

| Method | Endpoint                       | Auth Required          | Description                                        |
| :----- | :----------------------------- | :--------------------- | :------------------------------------------------- |
| `POST` | `/api/v1/auth/register`        | Public (Rate Limited)  | Register a new customer account                    |
| `POST` | `/api/v1/auth/login`           | Public (Rate Limited)  | Authenticate with email and password               |
| `GET`  | `/api/v1/auth/google`          | Public                 | Initiate Google OAuth 2.0 flow                     |
| `GET`  | `/api/v1/auth/google/callback` | Public                 | Google OAuth redirect callback handler             |
| `POST` | `/api/v1/auth/refresh`         | Public (Cookie / Body) | Refresh expired access token                       |
| `POST` | `/api/v1/auth/logout`          | Public (Cookie / Body) | Invalidate refresh token session and clear cookies |
| `GET`  | `/api/v1/auth/me`              | Bearer Token / Cookie  | Get currently authenticated user profile           |
| `GET`  | `/api/v1/auth/token`           | Bearer Token / Cookie  | Obtain/regenerate fresh Bearer access token        |

---

### `POST /api/v1/auth/register`

- **Use Case**: Creates a new user with default `CUSTOMER` role, starts an active auth session, sets auth cookies, and returns JWT tokens.
- **Auth**: None (Protected by `authRateLimiter`)

#### Request Body (`application/json`):

| Field       | Type     | Required | Constraints                                  |
| :---------- | :------- | :------- | :------------------------------------------- |
| `email`     | `string` | **Yes**  | Valid email format (normalized to lowercase) |
| `password`  | `string` | **Yes**  | Min 6 characters                             |
| `firstName` | `string` | No       | Min 1 character                              |
| `lastName`  | `string` | No       | Min 1 character                              |
| `username`  | `string` | No       | Min 3 characters, unique                     |
| `phone`     | `string` | No       | Phone number, unique                         |

```json
{
  "email": "customer@example.com",
  "password": "Password123!",
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe",
  "phone": "+8801700000000"
}
```

#### Response (`201 Created`):

```json
{
  "success": true,
  "message": "Account registered successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5c...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5c...",
    "tokenType": "Bearer",
    "user": {
      "id": "cmufpg9550016fnm6j90b3h70",
      "email": "customer@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "username": "johndoe",
      "avatarUrl": null,
      "phone": "+8801700000000",
      "role": "CUSTOMER",
      "status": "ACTIVE",
      "emailVerified": null,
      "lastLoginAt": null,
      "createdAt": "2026-09-24T20:00:00.000Z",
      "updatedAt": "2026-09-24T20:00:00.000Z"
    }
  }
}
```

---

### `POST /api/v1/auth/login`

- **Use Case**: Validates credentials, checks user `ACTIVE` status, records `lastLoginAt`, creates an `AuthSession` in Redis/DB, and returns tokens.
- **Auth**: None (Protected by `authRateLimiter`)

#### Request Body (`application/json`):

```json
{
  "email": "smmasrafi01@gmail.com",
  "password": "admin@1234"
}
```

#### Response (`200 OK`):

```json
{
  "success": true,
  "message": "Logged in successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5c...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5c...",
    "tokenType": "Bearer",
    "user": {
      "id": "cmufpg9550016fnm6j90b3h70",
      "email": "smmasrafi01@gmail.com",
      "firstName": "Super",
      "lastName": "Admin",
      "username": "superadmin",
      "avatarUrl": null,
      "phone": null,
      "role": "SUPER_ADMIN",
      "status": "ACTIVE",
      "emailVerified": "2026-09-24T21:47:00.000Z",
      "lastLoginAt": "2026-09-24T21:50:00.000Z",
      "createdAt": "2026-09-24T21:47:00.000Z",
      "updatedAt": "2026-09-24T21:50:00.000Z"
    }
  }
}
```

---

### `POST /api/v1/auth/refresh`

- **Use Case**: Rotates refresh tokens and issues a new access token. Reads refresh token from HTTP cookie `refresh_token` or request body `refreshToken`.
- **Auth**: None

#### Request Body (Optional if cookie is present):

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5c..."
}
```

#### Response (`200 OK`):

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1Ni...",
    "refreshToken": "eyJhbGciOiJIUzI1Ni...",
    "tokenType": "Bearer",
    "user": {
      "id": "cmufpg9550016fnm6j90b3h70",
      "email": "smmasrafi01@gmail.com",
      "role": "SUPER_ADMIN"
    }
  }
}
```

---

### `GET /api/v1/auth/me`

- **Use Case**: Returns the current authenticated user's complete profile and assigned role.
- **Auth**: Required (`Bearer <token>` or cookie)

#### Response (`200 OK`):

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cmufpg9550016fnm6j90b3h70",
      "email": "smmasrafi01@gmail.com",
      "firstName": "Super",
      "lastName": "Admin",
      "username": "superadmin",
      "avatarUrl": null,
      "phone": null,
      "role": "SUPER_ADMIN",
      "status": "ACTIVE",
      "emailVerified": "2026-09-24T21:47:00.000Z",
      "lastLoginAt": "2026-09-24T21:50:00.000Z",
      "createdAt": "2026-09-24T21:47:00.000Z",
      "updatedAt": "2026-09-24T21:50:00.000Z"
    }
  }
}
```

---

### `GET /api/v1/auth/token`

- **Use Case**: Returns/regenerates the Bearer token for the current session for API clients and Scalar/Swagger testing.
- **Auth**: Required (`Bearer <token>` or cookie)

#### Response (`200 OK`):

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1Ni...",
    "refreshToken": "eyJhbGciOiJIUzI1Ni...",
    "tokenType": "Bearer",
    "user": { ... }
  }
}
```

---

## 6. User Management Module (`/api/v1/users`)

All user management endpoints require authentication via JWT / Cookie.

### Summary Table

| Method   | Endpoint                            | Permission Required | Description                                 |
| :------- | :---------------------------------- | :------------------ | :------------------------------------------ |
| `GET`    | `/api/v1/users`                     | `user:read`         | Search, filter, and paginate users          |
| `GET`    | `/api/v1/users/:id`                 | `user:read`         | Get single user by ID                       |
| `PATCH`  | `/api/v1/users/:id/role`            | `user:update`       | Assign a role to a user (invalidates cache) |
| `PATCH`  | `/api/v1/users/:id/reset-role`      | `user:update`       | Reset user's role to `CUSTOMER`             |
| `PATCH`  | `/api/v1/users/:id/suspend`         | `user:update`       | Suspend user and revoke active sessions     |
| `PATCH`  | `/api/v1/users/:id/unsuspend`       | `user:update`       | Reactivate suspended user                   |
| `DELETE` | `/api/v1/users/:id/soft`            | `user:delete`       | Soft delete user (`DELETED` status)         |
| `DELETE` | `/api/v1/users/:id`                 | `user:delete`       | Permanently delete user from database       |
| `POST`   | `/api/v1/users/:id/revoke-sessions` | `user:update`       | Revoke all active login sessions for user   |

---

### `GET /api/v1/users`

- **Use Case**: Paginated search and filtering for staff and customers.
- **Permission**: `user:read`

#### Query Parameters:

| Parameter | Type     | Default  | Description                                             |
| :-------- | :------- | :------- | :------------------------------------------------------ |
| `page`    | `number` | `1`      | Page number (min 1)                                     |
| `limit`   | `number` | `10`     | Records per page (1-100)                                |
| `search`  | `string` | Optional | Case-insensitive search on email, name, username, phone |
| `status`  | `enum`   | Optional | `ACTIVE`, `INACTIVE`, `SUSPENDED`, `DELETED`            |
| `role`    | `string` | Optional | Filter by role name (e.g. `ADMIN`, `CUSTOMER`)          |

#### Example: `GET /api/v1/users?page=1&limit=10&search=masrafi&role=SUPER_ADMIN`

#### Response (`200 OK`):

```json
{
  "success": true,
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPage": 1
  },
  "data": [
    {
      "id": "cmufpg9550016fnm6j90b3h70",
      "email": "smmasrafi01@gmail.com",
      "emailVerified": "2026-09-24T21:47:00.000Z",
      "firstName": "Super",
      "lastName": "Admin",
      "username": "superadmin",
      "avatarUrl": null,
      "phone": null,
      "status": "ACTIVE",
      "roleId": "cmufpg9260000fnm6u383q211",
      "role": {
        "id": "cmufpg9260000fnm6u383q211",
        "name": "SUPER_ADMIN",
        "description": "Full system access with all permissions"
      },
      "createdAt": "2026-09-24T21:47:00.000Z",
      "updatedAt": "2026-09-24T21:47:00.000Z",
      "lastLoginAt": "2026-09-24T21:50:00.000Z"
    }
  ]
}
```

---

### `PATCH /api/v1/users/:id/role`

- **Use Case**: Changes the role assigned to a user and immediately invalidates their Redis permission cache (`permissionCache.invalidateUser`).
- **Permission**: `user:update`

#### Request Body (`application/json`):

```json
{
  "roleId": "cmufpg9260001fnm6v194a322"
}
```

#### Response (`200 OK`):

```json
{
  "success": true,
  "message": "Role assigned to user successfully",
  "data": {
    "user": { ... }
  }
}
```

---

### `PATCH /api/v1/users/:id/suspend`

- **Use Case**: Suspends an account, revokes all active auth sessions, and clears permission cache.
- **Permission**: `user:update`
- **Safeguard**: Prevents suspending `SUPER_ADMIN` accounts (returns `403 Forbidden`).

#### Response (`200 OK`):

```json
{
  "success": true,
  "message": "User account suspended successfully",
  "data": {
    "user": {
      "id": "cm...",
      "status": "SUSPENDED"
    }
  }
}
```

---

## 7. Role Management Module (`/api/v1/users/roles`)

### Summary Table

| Method   | Endpoint                              | Permission Required | Description                                         |
| :------- | :------------------------------------ | :------------------ | :-------------------------------------------------- |
| `GET`    | `/api/v1/users/roles`                 | `role:read`         | List all roles with user and permission counts      |
| `GET`    | `/api/v1/users/roles/:id`             | `role:read`         | Get role details by ID with permissions list        |
| `POST`   | `/api/v1/users/roles`                 | `role:update`       | Create a new role with optional initial permissions |
| `PATCH`  | `/api/v1/users/roles/:id`             | `role:update`       | Update role name or description                     |
| `DELETE` | `/api/v1/users/roles/:id`             | `role:update`       | Delete custom role (if no users assigned)           |
| `PUT`    | `/api/v1/users/roles/:id/permissions` | `role:update`       | Sync/replace permissions assigned to role           |
| `DELETE` | `/api/v1/users/roles/:id/permissions` | `role:update`       | Remove specific permissions from role               |

---

### `GET /api/v1/users/roles`

- **Use Case**: View all system and custom roles with counts.
- **Permission**: `role:read`

#### Response (`200 OK`):

```json
{
  "success": true,
  "data": {
    "roles": [
      {
        "id": "cmufpg9260000fnm6u383q211",
        "name": "SUPER_ADMIN",
        "description": "Full system access with all permissions",
        "userCount": 1,
        "permissionCount": 35,
        "permissions": [
          {
            "id": "cmufpg9350004fnm6p732j988",
            "resource": "product",
            "action": "read",
            "description": "View products"
          }
        ],
        "createdAt": "2026-09-24T21:47:00.000Z",
        "updatedAt": "2026-09-24T21:47:00.000Z"
      }
    ]
  }
}
```

---

### `POST /api/v1/users/roles`

- **Use Case**: Create a new role and optionally link permissions.
- **Permission**: `role:update`

#### Request Body (`application/json`):

```json
{
  "name": "MODERATOR",
  "description": "Catalog reviewer and moderator",
  "permissionIds": ["cmufpg9350004fnm6p732j988", "cmufpg9350005fnm6p732j989"]
}
```

#### Response (`201 Created`):

```json
{
  "success": true,
  "message": "Role created successfully",
  "data": {
    "role": {
      "id": "cmufrole0001fnm6x9812a1",
      "name": "MODERATOR",
      "description": "Catalog reviewer and moderator",
      "permissions": [ ... ],
      "createdAt": "2026-09-24T22:00:00.000Z",
      "updatedAt": "2026-09-24T22:00:00.000Z"
    }
  }
}
```

---

### `PUT /api/v1/users/roles/:id/permissions`

- **Use Case**: Assigns or replaces the complete set of permissions for a role in a single transaction, and automatically invalidates all permission caches in Redis (`permissionCache.invalidateAll()`).
- **Permission**: `role:update`

#### Request Body (`application/json`):

```json
{
  "permissionIds": [
    "cmufpg9350004fnm6p732j988",
    "cmufpg9350005fnm6p732j989",
    "cmufpg9350006fnm6p732j990"
  ]
}
```

#### Response (`200 OK`):

```json
{
  "success": true,
  "message": "Permissions assigned to role successfully",
  "data": {
    "role": {
      "id": "cmufrole0001fnm6x9812a1",
      "name": "MODERATOR",
      "userCount": 2,
      "permissionCount": 3,
      "permissions": [ ... ]
    }
  }
}
```

---

## 8. Permission Management Module (`/api/v1/users/permissions`)

### Summary Table

| Method   | Endpoint                        | Permission Required | Description                        |
| :------- | :------------------------------ | :------------------ | :--------------------------------- |
| `GET`    | `/api/v1/users/permissions`     | `role:read`         | List all system permissions        |
| `POST`   | `/api/v1/users/permissions`     | `role:update`       | Create a new permission definition |
| `DELETE` | `/api/v1/users/permissions/:id` | `role:update`       | Delete a permission definition     |

---

### `GET /api/v1/users/permissions`

- **Use Case**: View all permissions grouped/sorted by `resource` and `action`.
- **Permission**: `role:read`

#### Response (`200 OK`):

```json
{
  "success": true,
  "data": {
    "permissions": [
      {
        "id": "cmufpg9350004fnm6p732j988",
        "resource": "product",
        "action": "create",
        "description": "Create new products",
        "createdAt": "2026-09-24T21:47:00.000Z"
      },
      {
        "id": "cmufpg9350005fnm6p732j989",
        "resource": "product",
        "action": "read",
        "description": "View products",
        "createdAt": "2026-09-24T21:47:00.000Z"
      }
    ]
  }
}
```

---

### `POST /api/v1/users/permissions`

- **Use Case**: Register a new granular permission (e.g. `coupon:create`, `analytics:view`).
- **Permission**: `role:update`

#### Request Body (`application/json`):

```json
{
  "resource": "coupon",
  "action": "create",
  "description": "Create discount coupons"
}
```

#### Response (`201 Created`):

```json
{
  "success": true,
  "message": "Permission created successfully",
  "data": {
    "permission": {
      "id": "cmufperm001fnm6k9120a3",
      "resource": "coupon",
      "action": "create",
      "description": "Create discount coupons",
      "createdAt": "2026-09-24T22:05:00.000Z"
    }
  }
}
```

---

## 9. Error Handling & Standard Responses

The application returns standardized JSON error responses with consistent HTTP status codes:

### Common Error Codes

| Status Code             | Reason                 | Example Scenario                                          |
| :---------------------- | :--------------------- | :-------------------------------------------------------- |
| `400 Bad Request`       | Validation Failure     | Invalid email format, missing required body field         |
| `401 Unauthorized`      | Authentication Missing | Missing or expired JWT token                              |
| `403 Forbidden`         | Authorization Failure  | User does not have `user:update` permission               |
| `404 Not Found`         | Entity Missing         | User ID or Role ID not found                              |
| `409 Conflict`          | Duplicate Unique Field | Email or Username already registered, Role already exists |
| `429 Too Many Requests` | Rate Limit Exceeded    | Exceeded 5 login attempts in 15 mins                      |
| `500 Internal Error`    | Server Failure         | Database failure or unhandled exception                   |

### Error Response Schema:

```json
{
  "success": false,
  "message": "Forbidden: You do not have permission to perform 'update' on 'user'"
}
```
