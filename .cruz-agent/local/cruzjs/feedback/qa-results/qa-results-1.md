# QA Results #1

## Verdict: NEEDS_WORK

## Summary
- Total Tests: 63 (across 10 spec files)
- Passed: 0
- Failed: 0
- Skipped: 63 (all tests skipped due to dev server not starting)

## BLOCKER: Dev Server Cannot Start

The local development server fails to start, which prevents ALL E2E tests from running. Every test suite has a `beforeAll` guard that checks `GET /api/health` and skips the entire suite when the server is unreachable.

### Root Cause

The vite-node module resolver (used by React Router's route config loader) cannot resolve `@cruzjs/core/logging`:

```
Error: Route config in "routes.ts" is invalid.
Error: Cannot find package '@cruzjs/core/logging' imported from
  '/home/kerryritter/Workspaces/cruzjs/packages/core/src/shared/shared.module.ts'
```

**Resolution chain:**
1. `apps/web/src/routes.ts` loads via React Router's `cloudflareDevProxy`
2. Route config loading triggers `application.server.ts` -> `shared.module.ts`
3. `shared.module.ts` line 23 imports: `import { Logger } from '@cruzjs/core/logging';`
4. `@cruzjs/core` package.json has wildcard export: `"./*": "./src/*"`
5. vite-node's module resolver does NOT resolve `@cruzjs/core/logging` through this wildcard to `./src/logging/index.ts`

**Contributing factors:**
- `packages/core/src/logging/` directory exists on disk but is **untracked by git** (never committed)
- No explicit `"./logging": "./src/logging/index.ts"` entry in `@cruzjs/core` package.json exports
- The wildcard pattern `"./*": "./src/*"` does not work with vite-node's resolution for directory imports needing `/index.ts`

### Fix Required (CRITICAL)

Add explicit export entry to `packages/core/package.json`:

```json
"./logging": "./src/logging/index.ts",
```

And commit the untracked `packages/core/src/logging/` directory.

### Secondary Issues

1. **vite-plus dependency**: Resolved from `localhost:4873` (local npm registry). The `npm install` with `--legacy-peer-deps` installed it from the lockfile, but this is fragile for CI/fresh clones.

2. **vite binary symlink**: The CLI looks for `apps/web/node_modules/.bin/vite` (or `vp`) but npm workspaces hoist all binaries to root `node_modules/.bin/`. Manual symlinks were needed.

## Test Files Reviewed

All 10 spec files were reviewed for correctness. The test logic is well-structured:

| Spec File | Test Count | Pattern | Notes |
|-----------|-----------|---------|-------|
| health-checks.spec.ts | 7 | API endpoint verification | Tests health, detailed, readiness tRPC endpoints |
| maintenance-mode.spec.ts | 5 | Auth/public verification | Tests status (public) and enable/disable (auth required) |
| rate-limiting.spec.ts | 5 | Header verification + stress | Tests rate limit headers, 429 responses, rapid requests |
| feature-flags.spec.ts | 5 | Auth + CRUD | Tests org-scoped CRUD with authenticated session |
| webhooks.spec.ts | 5 | Auth + CRUD | Tests webhook lifecycle including test delivery |
| i18n.spec.ts | 9 | Locale handling | Tests Accept-Language headers, locale fallback |
| http-client.spec.ts | 4 | Indirect verification | Tests via health + webhook endpoints |
| api-tokens.spec.ts | 7 | Auth + CRUD | Tests API key lifecycle, verify, revoke |
| scheduler.spec.ts | 6 | Auth + admin | Tests scheduler endpoints with auth checks |
| trpc-api.spec.ts | 10 | Infrastructure | Tests batch requests, error shapes, CORS, validation |

### Potential Test Issues (to verify once server starts)

1. **feature-flags.spec.ts line 69**: Imports `./helpers` which needs `registerUser` and `createOrganization` -- verify these helpers work with current auth flow.

2. **rate-limiting.spec.ts line 97**: Sends 200 parallel requests to trigger rate limiting. Line 108 assumes all responses are either 200 or 429, but other status codes (302 redirects) could appear.

3. **trpc-api.spec.ts line 49**: Expects unknown tRPC procedures to return `status < 500`. tRPC v11 may return 404 or 500 for unknown procedures depending on configuration.

4. **trpc-api.spec.ts line 102**: Tests `job.getStatus` and `upload.get` endpoints -- verify these tRPC procedures actually exist in the router.

5. **i18n.spec.ts line 72**: Navigates to `/auth/login` and checks `document.readyState === 'complete'`. If the page redirects (e.g., already authenticated), this may behave unexpectedly.

## Acceptance Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| E2E tests execute | FAIL | Dev server blocker |
| Health check endpoints work | BLOCKED | Cannot verify |
| Maintenance mode endpoints work | BLOCKED | Cannot verify |
| Rate limiting active | BLOCKED | Cannot verify |
| Feature flags CRUD | BLOCKED | Cannot verify |
| Webhooks CRUD | BLOCKED | Cannot verify |
| i18n locale handling | BLOCKED | Cannot verify |
| HTTP client functions | BLOCKED | Cannot verify |
| API tokens CRUD | BLOCKED | Cannot verify |
| Scheduler endpoints | BLOCKED | Cannot verify |
| tRPC infrastructure | BLOCKED | Cannot verify |

## Console Errors
```
Error: Cannot find package '@cruzjs/core/logging' imported from
  packages/core/src/shared/shared.module.ts
```

## Recommendations

### Immediate (to unblock E2E tests):
1. Add `"./logging": "./src/logging/index.ts"` to `packages/core/package.json` exports map
2. `git add packages/core/src/logging/` to track the logging module
3. Verify all other new modules referenced via the wildcard export actually resolve (health, monitoring, etc.)

### Follow-up:
4. Add all other missing explicit exports for new modules (health, monitoring, etc.) rather than relying on the wildcard
5. Fix the workspace binary hoisting issue in the CLI's `dev-server.tsx` -- look for vite/vp in root `node_modules/.bin/` as fallback
6. Once the server starts, re-run the full E2E suite
