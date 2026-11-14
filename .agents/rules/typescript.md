# TypeScript Strict Coding Standards

All TypeScript code in this repository must satisfy strict compiler constraints and design guidelines.

## 1. Compiler Configuration Compliance
The project enforces `"moduleResolution": "bundler"`, `"module": "preserve"`, and strict mode flags:
* `"strict": true`
* `"noUncheckedIndexedAccess": true`
* `"noImplicitOverride": true`
* `"noFallthroughCasesInSwitch": true`

## 2. Type Safety Rules
1. **No `any` Types:**
   - The use of `any` is forbidden.
   - Use `unknown` when the type cannot be determined in advance, followed by type narrowing or Zod parsing.
2. **Handle Optional & Undefined Properties:**
   - Because `noUncheckedIndexedAccess` is enabled, accessing array elements (`arr[0]`) or indexed objects produces `T | undefined`.
   - Always verify existence using optional chaining (`?.`), nullish coalescing (`??`), or explicit existence checks before dereferencing.
3. **Explicit Method Signatures:**
   - Public class methods, service functions, and exported helpers must declare explicit return types.
4. **Zod Type Inference:**
   - DTOs and input types must be inferred directly from Zod schemas using `z.infer<typeof schema>` to maintain a single source of truth.
5. **No Type Assertions (`as`) Without Validation:**
   - Avoid force casts like `data as User`. If data comes from untrusted boundaries (HTTP request, external API, environment variables), validate it with Zod.
6. **Import Formats:**
   - Follow standard ES module import syntax.
   - For type-only imports, use `import type { ... }` or `import { type ... }`.
