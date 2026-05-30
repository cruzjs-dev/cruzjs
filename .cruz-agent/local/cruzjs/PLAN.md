# Implementation Plan: LoggingModule Enhancement (Pino)

## Feature Overview

Replace the CruzJS Logger's custom formatting engine with Pino while preserving the existing public API. Add AsyncLocalStorage context propagation, per-namespace log levels, sensitive field redaction, environment-aware formatting, transport configuration, and optional OpenTelemetry trace context injection.

## Implementation Tasks

### Phase 1: Dependencies and Types

1. [ ] Add `pino` to dependencies, `pino-pretty` to devDependencies in `packages/core/package.json`
2. [ ] Add `LogContextStore`, `NamespaceLevelConfig`, `LoggingConfig`, `LOGGER_FACTORY` token to `log.types.ts`

### Phase 2: Core Implementation

3. [ ] Create `packages/core/src/logging/log-context.ts` — AsyncLocalStorage wrapper
4. [ ] Create `packages/core/src/logging/namespace-levels.ts` — Parse LOG_LEVELS env var, resolve level for namespace
5. [ ] Create `packages/core/src/logging/redaction.ts` — Default redaction paths + merge with env
6. [ ] Create `packages/core/src/logging/pino-factory.ts` — Pino instance factory (dev/prod/edge modes)
7. [ ] Create `packages/core/src/logging/adapters/log-adapter-destination.ts` — Wrap LogAdapter as Pino dispatch
8. [ ] Rewrite `packages/core/src/logging/logger.service.ts` — Pino engine, preserve public API

### Phase 3: Middleware Integration

9. [ ] Update routing middleware to wrap handlers with `LogContext.run()`
10. [ ] Update `createRequestLogger()` to populate LogContext

### Phase 4: Module Registration

11. [ ] Enhance `LoggingModule` with `LOGGER_FACTORY` provider and `forRoot()` static method
12. [ ] Update barrel exports

### Phase 5: OTel Integration

13. [ ] Optional TracingService injection for traceId/spanId

### Phase 6: Tests

14. [ ] LogContext, namespace levels, redaction, and Logger unit tests

### Phase 7: Env Schema

15. [ ] Add LOG_LEVELS, LOG_REDACT_PATHS, LOG_TRANSPORT, LOG_TRANSPORT_OPTIONS to env schema
