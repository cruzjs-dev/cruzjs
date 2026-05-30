# Code Review #1 — LoggingModule Enhancement (Pino Rewrite)

## Verdict: NEEDS_WORK

## Summary

The Pino rewrite is well-structured overall: clean separation of concerns across log-context, namespace-levels, redaction, pino-factory, adapter-destination, and the rewritten Logger service. Backward compatibility with the existing public API is preserved (warn alias, error with Error object, withContext/withCorrelationId/withSource, setContext/clearContext, addAdapter, flush). However, there are several high-priority issues around edge runtime compatibility, unused dead code, a security gap in redaction, and a DI pattern violation in how child loggers are created.

## Files Reviewed

- `packages/core/src/logging/log-context.ts` — 29 lines
- `packages/core/src/logging/namespace-levels.ts` — 43 lines
- `packages/core/src/logging/redaction.ts` — 15 lines
- `packages/core/src/logging/pino-factory.ts` — 94 lines
- `packages/core/src/logging/adapters/log-adapter-destination.ts` — 25 lines
- `packages/core/src/logging/logger.service.ts` — 250 lines
- `packages/core/src/logging/logging.middleware.ts` — 70 lines
- `packages/core/src/logging/logging.module.ts` — 29 lines
- `packages/core/src/logging/log.types.ts` — 58 lines
- `packages/core/src/logging/index.ts` — 42 lines
- `packages/core/src/index.ts` — updated exports
- `packages/core/src/logging/__tests__/logger.test.ts` — 582 lines
- `packages/core/package.json` — pino dependency added

## Security Review

**ISSUE FOUND** — Redaction has a gap. See High Priority #1.

## Data Ownership Review

PASS — Logging is infrastructure, not org/user-scoped data. No data ownership concerns.

## Issues Found

### Critical (Blocks Merge)

None.

### High Priority (Should Fix)

1. **AsyncLocalStorage import from `node:async_hooks` breaks Cloudflare Workers**
   - File: `packages/core/src/logging/log-context.ts:1`
   - Problem: Cloudflare Workers do not support `node:async_hooks`. The `AsyncLocalStorage` class is available in Workers, but it must be imported from `node:async_hooks` only when the Node.js compat flag is enabled. However, the code in `pino-factory.ts` already detects edge runtime via `HTMLRewriter` presence. The `log-context.ts` file will cause a module resolution error at import time in Workers environments without the `nodejs_compat` flag, which is a likely deployment scenario.
   - Fix: Either (a) conditionally import/construct the `AsyncLocalStorage` only in non-edge environments, (b) document that `nodejs_compat` is required, or (c) use a polyfill pattern that gracefully degrades (e.g., return `undefined` from `getStore()` when ALS is unavailable). Since CruzJS targets Cloudflare Workers as a primary runtime, this must be addressed.

2. **Redaction does not cover nested object paths recursively**
   - File: `packages/core/src/logging/redaction.ts`
   - Problem: The default redact paths include `context.password`, `context.token`, etc. but Pino's path-based redaction is shallow — it only redacts at the exact path specified. If a consumer logs `logger.info('msg', { user: { password: '...' } })`, the password at `context.user.password` will NOT be redacted because only `context.password` is listed. The top-level `password` path would only match if `password` is a top-level key in the Pino log object (which it never is, since all context goes under `context`). This is a security gap for a framework-level logger.
   - Fix: Either (a) add wildcard/glob redaction paths like `**.password`, `**.token`, `**.secret` (Pino supports `['**.password']` syntax for deep matching), or (b) document clearly that only top-level context keys are redacted and consumers must add their own paths. Option (a) is strongly recommended for a framework default.

3. **`globalThis` mutation for config passing is fragile and not type-safe**
   - File: `packages/core/src/logging/logging.module.ts:25` and `packages/core/src/logging/logger.service.ts:48,52,56`
   - Problem: `LoggingModule.forRoot()` stores config on `(globalThis as any).__cruzjs_logging_config`. The Logger constructor reads it. This bypasses the DI container entirely. Multiple calls to `forRoot()` with different configs would silently overwrite each other. The `as any` casts are also a pattern violation (no `any` types per CruzJS conventions).
   - Fix: Use the DI container to provide `LoggingConfig`. Register a `LOGGING_CONFIG` injection token, bind the config value in `forRoot()`, and inject it into Logger's constructor. This is the standard CruzJS module pattern.

4. **`createChild()` bypasses DI — child loggers are not injectable instances**
   - File: `packages/core/src/logging/logger.service.ts:234-248`
   - Problem: `createChild()` uses `Object.create(Logger.prototype)` and manually copies properties. This creates objects that look like `Logger` instances but were never constructed through Inversify, so they lack proper DI metadata. While child loggers are not typically resolved from the container, this pattern could cause subtle issues if a child logger is passed to code that expects a fully DI-constructed instance. More importantly, the `readonly` modifiers on the copied fields (`minLevel`, `isProduction`, `namespaceLevels`, `pinoInstance`) are bypassed by `Object.assign`, which is a TypeScript safety violation.
   - Fix: This is acceptable as a pragmatic pattern for child loggers (Pino itself does something similar), but the `readonly` bypass should be acknowledged with a comment, and `configService` should not be copied to child loggers since they never use it (they inherit the already-computed values).

5. **Unused exports: `PINO_TO_CRUZ_LEVEL` and `PINO_LEVEL_TO_CRUZ`**
   - File: `packages/core/src/logging/pino-factory.ts:12` and `packages/core/src/logging/adapters/log-adapter-destination.ts:4`
   - Problem: `PINO_TO_CRUZ_LEVEL` is exported from `pino-factory.ts` but never imported anywhere. `PINO_LEVEL_TO_CRUZ` is declared in `log-adapter-destination.ts` but never referenced. Both are dead code.
   - Fix: Remove both unused maps, or if they are intended for future use, mark them with a TODO comment and do not export them.

### Medium Priority

1. **Duplicate level mapping in `logger.service.ts`**: Lines 207-213 define a `CRUZ_TO_PINO` map inline in the `log()` method. The same mapping already exists in `pino-factory.ts` as `CRUZ_TO_PINO_LEVEL`. This should be imported rather than duplicated, both for DRY and to prevent the two maps from drifting out of sync.

2. **Edge runtime detection heuristic is brittle**: `pino-factory.ts` line 52-53 detects edge via `typeof caches !== 'undefined' && typeof HTMLRewriter !== 'undefined'`. `HTMLRewriter` is Cloudflare-specific and would not detect other edge runtimes (Vercel Edge, Deno Deploy). Consider using a more explicit signal, such as a config flag or checking for `navigator.userAgent` containing "Cloudflare-Workers", or simply making `isEdge` a parameter passed through the module config.

3. **`pino-pretty` as devDependency could cause silent failures**: In `pino-factory.ts:62-77`, the code tries `pino-pretty` transport and catches the error. This is correct, but `pino-pretty` is listed as a `devDependency` in `package.json`. Consumers of `@cruzjs/core` will not get `pino-pretty` installed automatically, so development mode will silently fall back to raw JSON output. Either document this or add it as an optional peer dependency with a clear message.

4. **No test for Pino output redaction**: The tests cover `buildRedactPaths` utility but do not verify that Pino actually redacts sensitive fields in output. A test that logs a message with `{ password: 'secret123' }` and asserts the Pino output contains `[REDACTED]` would catch integration issues between the redaction config and Pino.

5. **`LogContext.set()` uses `as Record<string, unknown>` cast**: In `log-context.ts:18`, the `LogContextStore` type already has an index signature `[key: string]: unknown`, so the cast is unnecessary. Remove it for cleanliness.

### Low Priority

1. **`NamespaceLevelConfig` parsing could warn on invalid entries**: `parseNamespaceLevels` silently drops invalid entries (e.g., `db:invalid`). Consider logging a warning for invalid entries so operators know their config is wrong.

2. **Missing JSDoc on new public exports**: `LogContext`, `parseNamespaceLevels`, `resolveNamespaceLevel`, `buildRedactPaths` are exported without JSDoc. As framework-level APIs, they should have documentation.

3. **`LOGGER_FACTORY` symbol string could collide**: `Symbol.for('cruzjs:logger-factory')` uses a global symbol. This is fine for CruzJS but could theoretically collide if two versions of `@cruzjs/core` are loaded. Minor concern.

4. **Test file still imports old formatters**: The test file imports and tests `JsonLogFormatter` and `PrettyLogFormatter`. These are preserved for backward compat, which is good, but a comment clarifying they are legacy/preserved would help future maintainers understand why both Pino and the old formatters exist.

## Pattern Compliance

| Pattern | Status |
|---------|--------|
| Data ownership correct | N/A (infrastructure) |
| orgProcedure/protectedProcedure | N/A (no routes) |
| requirePermission() | N/A (no routes) |
| @injectable() / @inject() | PARTIAL — Logger uses @injectable/@inject correctly, but config passing uses globalThis instead of DI |
| Drizzle schema indexes | N/A (no schema) |
| Component export const | N/A (no components) |
| No `any` types | FAIL — Multiple `(globalThis as any)` casts and `(this.pinoInstance as any)` |
| No `as` casting | FAIL — Several `as` casts in logger.service.ts and log-context.ts |
| Explicit return types on exports | PASS |

## Recommendations

1. Fix the AsyncLocalStorage import for Cloudflare Workers compatibility — this is the most likely runtime breakage.
2. Add deep wildcard redaction paths (`**.password`, `**.token`, `**.secret`, etc.) to close the security gap.
3. Replace `globalThis` config passing with proper DI token injection via `LOGGING_CONFIG` symbol.
4. Remove dead code (`PINO_TO_CRUZ_LEVEL`, `PINO_LEVEL_TO_CRUZ`) and deduplicate the level mapping in `log()`.
5. Add an integration test that verifies Pino actually redacts sensitive fields end-to-end.
