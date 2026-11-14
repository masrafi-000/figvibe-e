---
name: security-auditing
description: >-
  Use this skill when auditing endpoints, authentication logic, RBAC permissions,
  cryptographic routines, or reviewing code changes for security vulnerabilities in Figvibe.
---

# Security Auditing Skill

This skill provides an audit framework to evaluate endpoints, authentication flows, RBAC authorization, and data privacy against industry security standards.

## 1. Security Checklist

Before approving any backend PR or new endpoint, verify each of the following:

### A. Authentication & Session Verification
- [ ] Is the endpoint appropriately protected by `authenticate` middleware if private?
- [ ] Are tokens stored in HttpOnly, Secure, SameSite cookies for web clients or extracted via standard Bearer scheme?
- [ ] Are password hashes checked with constant-time comparison (`bcrypt.compare`)?
- [ ] Is there an active brute-force rate limiter on login/register endpoints?

### B. Authorization (RBAC) Integrity
- [ ] Does the endpoint check required permissions using `requirePermission('<resource>:<action>')`?
- [ ] Are tenant/user boundaries enforced (e.g., verifying that a user can only access their own orders unless holding `order:read_all`)?
- [ ] Does modifying a role trigger instant cache invalidation in Redis (`PermissionCacheService`)?

### C. Input Validation & Injection Resistance
- [ ] Are all route parameters (`params`), query strings (`query`), and request payloads (`body`) strictly validated with Zod schemas?
- [ ] Is raw SQL avoided? If `$queryRaw` is used, are parameters passed via tagged template literals rather than string interpolation?
- [ ] Are file uploads restricted by MIME type, size limit, and randomized filenames?

### D. Data Privacy & Leaks
- [ ] Are password hashes, refresh token secrets, and internal database IDs omitted from JSON responses?
- [ ] Are error responses generic in production (no database stack traces returned to users)?
- [ ] Are sensitive tokens excluded from logs?

## 2. Security Review Report Template

When completing a security audit, produce a structured markdown report:

```markdown
### Security Audit Report: <Feature/PR Name>

- **Target Route(s):** `POST /api/v1/orders`
- **Authentication Guard:** `authenticate` (Passed)
- **Authorization Guard:** `requirePermission('order:create')` (Passed)
- **Input Validation:** Zod `createOrderSchema` enforced (Passed)
- **Rate Limiting:** Global rate limiter attached (Passed)
- **Findings & Vulnerabilities:** None identified.
- **Verdict:** APPROVED
```
