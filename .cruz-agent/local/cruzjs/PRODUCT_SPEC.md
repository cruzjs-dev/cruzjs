# Product Spec: LoggingModule Enhancement (Pino)

## Feature Overview

Enhance CruzJS's existing `Logger` service by replacing its custom formatting engine with Pino, the fastest Node.js JSON logger. The enhanced Logger preserves the current public API while adding: automatic context propagation via AsyncLocalStorage, per-namespace log levels, sensitive field redaction, environment-aware formatting (pino-pretty in dev, JSON in prod), pluggable transports, and optional OpenTelemetry trace context injection.

## Data Ownership Model

Not applicable. This is infrastructure-level tooling with no database schema changes and no user/org-scoped data.

## User Stories

### US-1: Framework Consumer -- Structured Logging
As a CruzJS developer, I want structured JSON logs in production and pretty-printed logs in development so that I can debug locally and query logs in production (CloudWatch, Logpush, Stackdriver).

### US-2: Framework Consumer -- Automatic Request Context
As a CruzJS developer, I want every log entry in a request to automatically include the request ID, user ID, and org ID without manually passing a logger around.

### US-3: Framework Consumer -- Per-Namespace Levels
As a CruzJS developer, I want to set `LOG_LEVELS=auth:debug,db:warn` so that I can increase verbosity for specific subsystems without flooding the logs with debug output from everything.

### US-4: Framework Consumer -- Redaction
As a CruzJS developer, I want passwords, tokens, and other sensitive fields to be automatically redacted from log output so that I do not accidentally expose secrets.

### US-5: Framework Consumer -- Child Loggers per Service
As a CruzJS developer, I want each `@Injectable()` service to receive a child logger scoped to that service's name so that I can filter logs by source.

### US-6: Framework Consumer -- OTel Correlation
As a CruzJS developer using the TracingModule, I want my log entries to include the current `traceId` and `spanId` so that I can correlate logs with distributed traces.

### US-7: Framework Consumer -- Custom Transports
As a CruzJS developer, I want to plug in Pino transports (e.g., pino-loki, pino-datadog) per environment so that I can route logs to my preferred aggregation service.

### US-8: Adapter Author -- Log Adapter Compat
As a CruzJS adapter author, I want the existing `LogAdapter` interface to continue working so that my adapter's `bindings/logging.ts` implementation is not broken.

## Acceptance Criteria

- [ ] Pino is the logging engine in dev, prod, and edge runtimes
- [ ] pino-pretty output in development, JSON in production
- [ ] Every log entry within a request automatically includes requestId, userId, orgId
- [ ] LOG_LEVELS env var filters per-namespace (e.g., auth:debug,db:warn)
- [ ] Passwords, tokens, secrets are redacted by default
- [ ] Existing LogAdapter implementations continue to receive log entries
- [ ] LOGGER_FACTORY token produces child loggers with correct source
- [ ] Optional TracingService injection adds traceId/spanId when available
- [ ] All existing Logger tests pass (backward compatibility)
- [ ] Works on Cloudflare Workers edge runtime without polyfills

## Edge Cases

1. **Cloudflare Workers**: No Node.js streams. Pino configured with `write()` function.
2. **Empty LOG_LEVELS**: Falls back to global LOG_LEVEL.
3. **Invalid LOG_LEVELS format**: Logged as warning, ignored.
4. **Circular references in context**: Pino handles natively.
5. **LogContext outside request**: `getStore()` returns undefined; Logger omits context fields.
6. **pino-pretty not installed in prod**: Only loaded conditionally in dev.

## Scope

**In Scope:** Pino engine, LogContext (AsyncLocalStorage), per-namespace levels, redaction, dev/prod formatting, transport config, OTel integration, backward compat, tests, exports.

**Out of Scope:** Database logging, log aggregation UI, log sampling, client-side logging, console.log migration.
