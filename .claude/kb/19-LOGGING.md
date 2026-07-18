# Logging (Pino)

CruzJS uses **Pino** as its logging engine, wrapped by the `Logger` service. The Logger is a DI singleton registered in `SharedModule` — it is automatically available in every app without manual registration.

## Quick Reference

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { Logger } from '@cruzjs/core';

@Injectable()
export class MyService {
  constructor(@Inject(Logger) private readonly logger: Logger) {}

  async doWork() {
    this.logger.info('Starting work');
    this.logger.debug('Details', { key: 'value' });
    this.logger.warning('Something odd', { hint: 'check config' });
    this.logger.error('Failed', new Error('boom'));
    this.logger.critical('System down', { reason: 'OOM' });
  }
}
```

## Log Levels

| CruzJS level | Pino level | Severity | Use when |
|---|---|---|---|
| `debug` | `debug` | 0 | Detailed diagnostic info; dev-only verbosity |
| `info` | `info` | 1 | Normal operational events |
| `warning` / `warn` | `warn` | 2 | Unexpected but non-fatal |
| `error` | `error` | 3 | Failures needing attention |
| `critical` | `fatal` | 4 | System-level failures |

`warn()` is an alias for `warning()` — both work.

## Child Loggers

The Logger uses an immutable child-logger pattern. Each method returns a new Logger instance; the parent is unchanged.

```typescript
// Scope by source (service name) — used for namespace-level filtering
const log = this.logger.withSource('InvitationService');

// Add persistent context fields
const log = this.logger.withContext({ orgId: ctx.org.orgId });

// Add a correlation ID
const log = this.logger.withCorrelationId(requestId);

// Chain all three
const log = this.logger
  .withSource('PaymentService')
  .withCorrelationId(requestId)
  .withContext({ userId });
```

## LOGGER_FACTORY — Preferred Pattern for Services

Inject `LOGGER_FACTORY` to get a pre-scoped child logger without depending on the root `Logger`:

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { LOGGER_FACTORY, type LoggerFactory } from '@cruzjs/core';

@Injectable()
export class MyService {
  private readonly logger;

  constructor(@Inject(LOGGER_FACTORY) factory: LoggerFactory) {
    this.logger = factory('MyService');  // equivalent to logger.withSource('MyService')
  }
}
```

`LOGGER_FACTORY` is registered in `LoggingModule`, which is loaded by `SharedModule` — no manual registration required.

## Automatic Request Context (LogContext)

`LogContext` uses **AsyncLocalStorage** (`node:async_hooks`) to automatically propagate request-scoped fields (requestId, userId, orgId, traceId, spanId) into every log entry within the request, without passing a logger around.

> **Cloudflare Workers**: add `compatibility_flags = ["nodejs_compat"]` to `wrangler.toml`. Without it the build fails, surfacing the missing flag explicitly.

### How it works

The routing middleware calls `LogContext.run({ requestId })` at the start of each request. The Logger reads from `LogContext.getStore()` on every log call.

```typescript
// Every log entry inside a request automatically includes:
// { requestId, userId, orgId, traceId, spanId }

// You can also set additional fields anywhere in the call stack:
import { LogContext } from '@cruzjs/core';

LogContext.set('tenantId', 'tenant_abc');
// All subsequent logs in this request now include tenantId
```

### Populating context in tRPC procedures

The tRPC context builder should set userId and orgId:

```typescript
// In your tRPC context creation:
import { LogContext } from '@cruzjs/core';

LogContext.set('userId', session.user.id);
LogContext.set('orgId', ctx.org.orgId);
```

### LogContextStore shape

```typescript
type LogContextStore = {
  requestId?: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  orgId?: string;
  [key: string]: unknown;  // extend with any fields
};
```

## Per-Namespace Log Levels

Set `LOG_LEVELS` to control verbosity per subsystem without flooding everything with debug output:

```bash
# .dev.vars or environment
LOG_LEVEL=info
LOG_LEVELS=auth:debug,db:warning,trpc:debug
```

- Format: comma-separated `namespace:level` pairs
- The `namespace` matches the `source` passed to `withSource()` or `LOGGER_FACTORY`
- Hierarchical: `auth.oauth` matches `auth:debug` if no more specific rule exists
- Invalid entries are silently ignored; global `LOG_LEVEL` is the fallback

```typescript
// This logger's level will be 'debug' (from LOG_LEVELS=auth:debug)
const authLog = this.logger.withSource('auth');
authLog.debug('Checking session');  // ✅ appears

// This logger's level will be 'warning' (from LOG_LEVELS=db:warning)
const dbLog = this.logger.withSource('db');
dbLog.info('Query plan');  // ❌ filtered
dbLog.warning('Slow query');  // ✅ appears
```

## Sensitive Field Redaction

Pino's native `redact` feature automatically censors sensitive fields before they reach any output or adapter. Default redacted paths:

```
password, token, secret, accessToken, refreshToken,
authorization, cookie, ssn, creditCard,
context.password, context.token, context.secret,
context.accessToken, context.refreshToken,
context.authorization, context.cookie
```

Redacted values become `[REDACTED]` in the output.

### Extending redaction paths

```bash
# .dev.vars or environment
LOG_REDACT_PATHS=apiKey,context.privateKey,payload.stripeToken
```

### Programmatic configuration (in server entry)

`LoggingModule.forRoot()` returns a configured module class that registers a `LOGGING_CONFIG` provider in the DI container — no `globalThis` mutation.

```typescript
// src/app.server.ts
import { registerModules } from '@cruzjs/core/framework/module-registry';
import { LoggingModule } from '@cruzjs/core';
import { StartModule } from '@cruzjs/start/start.module';

registerModules([
  StartModule,
  LoggingModule.forRoot({
    redactPaths: ['apiKey', 'context.internalToken'],
    transport: { target: 'pino-loki', options: { host: 'http://loki:3100' } },
  }),
]);
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `LOG_LEVEL` | `info` (prod), `debug` (dev) | Global minimum log level |
| `LOG_LEVELS` | — | Per-namespace overrides, e.g. `auth:debug,db:warning` |
| `LOG_REDACT_PATHS` | — | Extra redaction paths, comma-separated |
| `LOG_TRANSPORT` | — | Pino transport target (e.g. `pino-loki`) |
| `LOG_TRANSPORT_OPTIONS` | — | JSON string of transport options |

## Dev vs. Production Output

| Environment | Output |
|---|---|
| Development (`NODE_ENV != production`) | pino-pretty: colorized, human-readable |
| Production | Structured JSON to stdout |
| Cloudflare Workers (edge) | JSON via `console.log/error` — picked up by Logpush |

## Custom Transports

Any Pino-compatible transport works:

```bash
# Loki (Grafana)
LOG_TRANSPORT=pino-loki
LOG_TRANSPORT_OPTIONS={"host":"http://loki:3100"}

# Datadog
LOG_TRANSPORT=pino-datadog-transport
LOG_TRANSPORT_OPTIONS={"ddClientConf":{"authMethods":{"apiKeyAuthV1":{"apiKey":"YOUR_KEY"}}}}
```

Or configure programmatically via `LoggingModule.forRoot()`.

## LogAdapter Interface (Backward Compat)

The existing `LogAdapter` interface is preserved. Any adapter registered via `logger.addAdapter()` continues to receive `LogEntry` objects:

```typescript
import type { LogAdapter, LogEntry } from '@cruzjs/core';

class MyAdapter implements LogAdapter {
  async log(entry: LogEntry): Promise<void> {
    await sendToExternalService(entry);
  }

  async flush(): Promise<void> {
    await flushBuffer();
  }
}

// In your service or module setup:
logger.addAdapter(new MyAdapter());
```

## OTel Trace Context

When `TracingModule` is loaded, `traceId` and `spanId` from the active trace are automatically included in every log entry via `LogContext`. No additional setup required.

## Error Logging Pattern

```typescript
try {
  await this.externalApi.call(payload);
} catch (error) {
  // Pass Error as second arg — name, message, stack extracted automatically
  this.logger.error('External API call failed', error, {
    endpoint: '/api/send',
    payloadSize: JSON.stringify(payload).length,
  });
}
```

## Testing

In tests, silence Pino's stdout output and verify behavior via adapters:

```typescript
import { vi, beforeEach, afterEach } from 'vitest';

beforeEach(() => {
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
});
```

Use a mock `LogAdapter` to assert on log entries without depending on console output format.

## Exports

```typescript
// From @cruzjs/core
import {
  Logger,
  LOG_ADAPTER,
  LoggingModule,
  LogContext,
  LOGGER_FACTORY,
  LOGGING_CONFIG,
} from '@cruzjs/core';

import type {
  LogAdapter,
  LogLevel,
  LogEntry,
  LogContextStore,
  LoggingConfig,
  LoggerFactory,
  NamespaceLevelConfig,
} from '@cruzjs/core';

// From @cruzjs/core/logging (more granular)
import { buildRedactPaths, parseNamespaceLevels, resolveNamespaceLevel } from '@cruzjs/core/logging';
```
