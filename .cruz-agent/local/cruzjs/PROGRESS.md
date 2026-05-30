# Phase 22 D/E/F: AI Package -- MCP Bridge, Org-Scoped Keys, Usage Tracking

## Status: COMPLETE

### Summary

Implemented sub-phases D, E, and F for the `@cruzjs/ai` package: MCP Bridge for tool-call loop, OrgAIConfigService for per-org provider configuration, AIUsageTracker for token/request tracking, AIContainerModule for DI registration, and database schema for org AI configs.

### Files Created

- `packages/ai/src/mcp-bridge.ts` -- McpBridge class with `toToolDef()` (MCP-to-provider schema conversion) and `runWithTools()` (agentic tool-call loop with maxRounds guard)
- `packages/ai/src/org-ai-config.service.ts` -- OrgAIConfigService for per-org AI provider config (set/get/remove/forOrg), with ORG_AI_CONFIG_SERVICE token
- `packages/ai/src/usage-tracker.ts` -- AIUsageTracker for in-memory usage recording (record/getSummary/getRecords/clear), with AI_USAGE_TRACKER token
- `packages/ai/src/ai.module.ts` -- AIContainerModule (Inversify ContainerModule binding registry, config service, tracker as singletons)
- `packages/ai/src/database/schema.ts` -- orgAiConfigs Drizzle schema (id, orgId, provider, encryptedApiKey, defaultModel, maxTokensPerMonth, enabled, timestamps)
- `packages/ai/src/__tests__/mcp-bridge.test.ts` -- 9 unit tests (toToolDef mapping, no-tool-calls, tool-call loop, maxRounds, multiple tools, immutability)
- `packages/ai/src/__tests__/org-ai-config.test.ts` -- 10 unit tests (round-trip, defaults, overwrite, forOrg with enabled/disabled/missing/unknown provider, remove)
- `packages/ai/src/__tests__/usage-tracker.test.ts` -- 11 unit tests (record, getSummary aggregation/filtering, getRecords/copy safety, clear)

### Files Modified

- `packages/ai/src/index.ts` -- Added exports for McpBridge, OrgAIConfigService, AIUsageTracker, AIContainerModule, database schema types
- `apps/web/tsconfig.json` -- Added @cruzjs/ai and @cruzjs/ai/* path aliases
- `vitest.config.ts` -- Added @cruzjs/ai resolve alias for test runner

### Test Results

58 tests pass across 4 test files (30 new + 28 existing). Zero failures.

---

# Phase 16: Cache DX -- remember pattern, tagged cache, forget/flush

## Status: COMPLETE

### Summary

Added `remember()`, `rememberForever()`, `forget()`, `flush()` convenience methods and a full `TaggedCache` class to both cache backends (KVCacheService and CacheService/Redis). 20 unit tests covering all new functionality.

### Files Created

- `packages/core/src/shared/cache/tagged-cache.ts` -- `TaggedCache` class implementing `ITaggedCache`; wraps a cache backend and tracks keys under tag names via `set()`, supports `get()` and `flush()` by tag
- `packages/core/src/shared/cache/__tests__/cache.test.ts` -- 20 unit tests exercising remember, rememberForever, forget, flush, tagged cache get/set/flush, single-tag shorthand, rememberTagged regression, and remember+forget cycle

### Files Modified

- `packages/core/src/shared/cache/cache.interface.ts` -- Added `ITaggedCache` interface; added `forget()`, `flush()`, `rememberForever()` to `ICacheService`; changed `tags()` signature from `tags(tag: string): { flush }` to `tags(tagNames: string | string[]): ITaggedCache`
- `packages/core/src/shared/cloudflare/kv-cache.service.ts` -- Implemented `forget()`, `flush()`, `rememberForever()`, updated `tags()` to return `TaggedCache`, made `addKeyToTags` public for TaggedCache delegation
- `packages/core/src/shared/redis/cache.service.ts` -- Same changes as KV: `forget()`, `flush()`, `rememberForever()`, updated `tags()`, public `addKeyToTags`
- `packages/core/src/index.ts` -- Added `ITaggedCache` type export and `TaggedCache` class export

### Test Results

202 test files pass (4296 tests total, 1 pre-existing skip). Zero type errors in new/modified files.

### API Surface

```typescript
// remember pattern
const user = await cache.remember('user:1', 300, async () => db.getUser(1));

// remember forever (no TTL)
const config = await cache.rememberForever('app:config', async () => loadConfig());

// forget / flush
await cache.forget('user:1');     // delete single key
await cache.flush();               // clear all keys

// tagged cache
const tagged = cache.tags(['users', 'permissions']);
await tagged.set('user:1', userData, 300);
const user = await tagged.get<User>('user:1');
await tagged.flush();  // busts all keys tagged "users" OR "permissions"

// single tag shorthand
await cache.tags('users').flush();
```

---

# Phase 17: Testing Utilities -- Assertion Helpers and Fakes

## Status: COMPLETE

### Files Created

- `packages/core/src/testing/assertions.ts` -- Database assertion helpers: `assertDatabaseHas`, `assertDatabaseMissing`, `assertSoftDeleted`
- `packages/core/src/testing/queue-fake.ts` -- In-memory queue/job fake with `createQueueFake()`, assertions, and clear
- `packages/core/src/testing/time-travel.ts` -- `travel()` and `travelBack()` for freezing Date.now() in tests
- `packages/core/src/testing/__tests__/testing.test.ts` -- 38 unit tests covering all new utilities + existing mail fake

### Files Modified

- `packages/core/src/testing/index.ts` -- Added barrel exports for assertions, queue-fake, and time-travel

### Test Results

42 tests pass (38 new + 4 existing in test-app.test.ts). Zero type errors in new files.

### Notes

- Existing `createMailFake()` in `mail-fake.ts` was already complete and well-designed; tests were added for it rather than duplicating with a singleton pattern
- Database assertions use `CruzDatabase` interface (not raw Drizzle) for dialect-agnostic compatibility
- `assertSoftDeleted` expects tables with `id` and `deletedAt` columns (standard CruzJS soft-delete pattern)
- `./testing` export path was already configured in `packages/core/package.json`

---

# Phase 15: N+1 Query Detection

## Status: COMPLETE

### Files Created
- `packages/core/src/database/n1-detector.ts` -- N1Detector class implementing Drizzle `Logger`
- `packages/core/src/database/__tests__/n1-detector.test.ts` -- 9 unit tests, all passing

### Files Modified
- `packages/core/package.json` -- Added `"./database/n1-detector"` export
- `packages/core/src/index.ts` -- Added `N1Detector` to barrel exports

---

# Core Package Unit Tests + Integration Testing KB

## Status: COMPLETE

## Task 12: Core Package Unit Tests

Added unit tests for four core package modules. All 49 tests pass.

### Files Created

- `packages/core/src/di/__tests__/module-loader.test.ts` (8 tests)
  - Loading a @Module with a simple service provider
  - Loading a @Module with useValue provider
  - Loading a @Module with useFactory provider
  - Loading the same module twice does not double-bind
  - requiredEnv collection (single module and merged)
  - Module imports (transitive provider availability)
  - trpcRouters collection

- `packages/core/src/di/__tests__/cruz-container.test.ts` (13 tests)
  - register() and resolve() a simple injectable class
  - Singleton scope returns same instance
  - Transient scope returns different instances
  - get() with unbound token throws descriptive [CruzJS] error
  - Error includes common causes and token name
  - isBound() for bound and unbound tokens
  - isRegistered() for registered and unregistered classes
  - replace() swaps bindings
  - unregister() removes bindings, no-ops on unbound

- `packages/core/src/policies/__tests__/policy.test.ts` (22 tests -- pre-existing, already comprehensive)
  - definePolicy, can(), cannot(), enforce(), buildPolicyContext
  - Async policies, custom abilities, org role checks, no-org context

- `packages/core/src/framework/__tests__/create-cruz-app.test.ts` (6 tests)
  - getOrBuildContainer returns container + freshlyBuilt flag
  - Cached container returns freshlyBuilt=false
  - resetContainerCache clears the cache
  - buildContainerWithModules always creates new containers
  - Concurrent calls share the same container

## Task 23: Integration Testing KB + CLI Command

### Files Created

- `.claude/kb/16-INTEGRATION-TESTING.md` -- Full KB document covering:
  1. When to use integration vs unit tests
  2. Full working example with createTestContainer, createTestDb, createTestContext, callProcedure
  3. Testing org isolation
  4. Testing events with MockEventEmitter
  5. Testing permission enforcement (FORBIDDEN assertions)
  6. Test data setup patterns (factories, seeding, context helpers)
  7. Running tests: `cruz test` vs `cruz test --integration`

### Files Modified

- `packages/cli/src/commands/test.tsx` -- Added `integration` prop; when set, passes `--testPathPattern '.*\.integration\.test\.ts$'` to vitest
- `packages/cli/src/app.tsx` -- Added `integration?: boolean` to the `test` Command type; passes it to the Test component
- `packages/cli/src/index.tsx` -- Parses `--integration` flag and includes it in the test command object
