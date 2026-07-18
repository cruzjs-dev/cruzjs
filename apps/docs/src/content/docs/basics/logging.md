---
title: Logging
description: Structured logging with Pino in CruzJS — context propagation, per-namespace levels, redaction, and custom transports.
---

CruzJS uses [Pino](https://getpino.io/) as its logging engine, wrapped by the `Logger` service. It outputs structured JSON in production, pretty-printed colorized output in development, and works natively on Cloudflare Workers without any Node.js polyfills.

The `Logger` is a singleton registered in `SharedModule` and available through DI in any service — no manual registration required.

## Injecting the logger

```ts
import { Injectable, Inject } from '@cruzjs/core/di';
import { Logger } from '@cruzjs/core';

@Injectable()
export class ProjectService {
  constructor(
    @Inject(Logger) private readonly logger: Logger,
  ) {}

  async create(orgId: string, input: CreateInput): Promise<Project> {
    this.logger.info('Creating project', { orgId, name: input.name });
    const project = await this.db.insert(projects).values({ ... }).returning();
    this.logger.info('Project created', { projectId: project[0].id });
    return project[0];
  }
}
```

## LOGGER_FACTORY — preferred pattern

Inject `LOGGER_FACTORY` to get a child logger pre-scoped to your service name. This is cleaner than injecting the root `Logger` and calling `withSource()` yourself:

```ts
import { Injectable, Inject } from '@cruzjs/core/di';
import { LOGGER_FACTORY, type LoggerFactory } from '@cruzjs/core';

@Injectable()
export class InvitationService {
  private readonly logger;

  constructor(@Inject(LOGGER_FACTORY) factory: LoggerFactory) {
    this.logger = factory('InvitationService');
  }

  async accept(token: string, userId: string): Promise<void> {
    this.logger.info('Accepting invitation', { userId });
    // ...
  }
}
```

## Log levels

| Method | When to use |
|--------|-------------|
| `logger.debug(msg, ctx?)` | Detailed diagnostic info. Filtered out in production by default. |
| `logger.info(msg, ctx?)` | Normal operational events: resource created, job started. |
| `logger.warning(msg, ctx?)` | Unexpected but non-fatal: slow query, retry attempt, deprecated call. `warn()` is an alias. |
| `logger.error(msg, err?, ctx?)` | Failures that need attention: unhandled exceptions, external service errors. |
| `logger.critical(msg, ctx?)` | System-level failures: OOM, corrupt state, total service unavailability. |

## Structured context

Every log method accepts an optional context object. Fields appear as top-level keys in the JSON output:

```ts
this.logger.info('User logged in', {
  userId: user.id,
  email: user.email,
  ip: request.headers.get('x-forwarded-for'),
});
```

Production JSON output:

```json
{"level":"info","time":"2026-03-17T08:30:00.000Z","msg":"User logged in","source":"AuthService","requestId":"abc-123","userId":"usr_abc","orgId":"org_xyz","context":{"email":"user@example.com","ip":"1.2.3.4"}}
```

## Error logging

Pass an `Error` object as the second argument. The name, message, and stack trace are extracted automatically:

```ts
try {
  await externalApi.sendNotification(payload);
} catch (error) {
  this.logger.error('Notification delivery failed', error, {
    projectId,
    recipientId: userId,
  });
}
```

## Child loggers

`withSource`, `withContext`, and `withCorrelationId` return new Logger instances — the parent is unchanged:

```ts
const log = this.logger
  .withSource('PaymentService')
  .withCorrelationId(requestId)
  .withContext({ orgId });

log.info('Processing payment');  // includes source, requestId, and orgId on every entry
```

## Automatic request context

`LogContext` uses **AsyncLocalStorage** to automatically propagate request-scoped fields into every log entry within a request — no need to pass a logger around.

The framework sets `requestId`, `userId`, and `orgId` automatically. You can add your own fields:

```ts
import { LogContext } from '@cruzjs/core';

// Anywhere in the request call stack:
LogContext.set('tenantId', 'tenant_abc');

// All subsequent log entries in this request now include tenantId automatically
this.logger.info('Processing');  // → { ..., tenantId: 'tenant_abc' }
```

Fields propagated automatically per request:

| Field | Source |
|-------|--------|
| `requestId` | `x-correlation-id` / `x-request-id` header, or generated UUID |
| `userId` | Set by tRPC context builder on authenticated requests |
| `orgId` | Set by tRPC context builder on org-scoped requests |
| `traceId` / `spanId` | Set by `TracingModule` when loaded |

## Sensitive field redaction

Passwords, tokens, secrets, and other sensitive fields are **automatically redacted** from log output before they reach any destination. Redacted values become `[REDACTED]`.

Default redacted fields: `password`, `token`, `secret`, `accessToken`, `refreshToken`, `authorization`, `cookie`, `ssn`, `creditCard`, and the same fields nested under `context.*`.

Add custom paths via environment variable:

```bash
LOG_REDACT_PATHS=apiKey,context.stripeToken,payload.privateKey
```

Or programmatically in `src/app.server.ts`:

```ts
import { registerModules } from '@cruzjs/core/framework/module-registry';
import { LoggingModule } from '@cruzjs/core';

registerModules([
  LoggingModule.forRoot({
    redactPaths: ['apiKey', 'context.internalSecret'],
  }),
]);
```

## Per-namespace log levels

Set different log levels per subsystem without flooding all output with debug logs:

```bash
# .dev.vars
LOG_LEVEL=info
LOG_LEVELS=auth:debug,db:warning,trpc:debug
```

The namespace matches the `source` you pass to `withSource()` or `LOGGER_FACTORY`. Hierarchical matching works: `auth.oauth` inherits from `auth`.

```ts
// LOG_LEVELS=auth:debug is set
const authLogger = this.logger.withSource('auth');
authLogger.debug('Checking session');  // ✅ appears

// LOG_LEVELS=db:warning is set
const dbLogger = this.logger.withSource('db');
dbLogger.info('Query executing');   // ❌ filtered
dbLogger.warning('Slow query');     // ✅ appears
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` (prod) / `debug` (dev) | Global minimum log level |
| `LOG_LEVELS` | — | Per-namespace overrides: `auth:debug,db:warning` |
| `LOG_REDACT_PATHS` | — | Additional redaction paths, comma-separated |
| `LOG_TRANSPORT` | — | Pino transport target module name |
| `LOG_TRANSPORT_OPTIONS` | — | JSON string of transport options |

## Output by environment

| Environment | Output |
|-------------|--------|
| Development | pino-pretty — colorized, human-readable with timestamps |
| Production | Structured JSON to stdout |
| Cloudflare Workers | JSON via `console.log/error` — compatible with Logpush |

## Custom transports

Route logs to external services by setting `LOG_TRANSPORT`:

```bash
# Grafana Loki
LOG_TRANSPORT=pino-loki
LOG_TRANSPORT_OPTIONS={"host":"http://loki:3100","labels":{"app":"myapp"}}

# Datadog
LOG_TRANSPORT=pino-datadog-transport
LOG_TRANSPORT_OPTIONS={"ddClientConf":{"authMethods":{"apiKeyAuthV1":{"apiKey":"DD_API_KEY"}}}}
```

Or configure in code using `LoggingModule.forRoot()`:

```ts
LoggingModule.forRoot({
  transport: {
    target: 'pino-loki',
    options: { host: 'http://loki:3100' },
  },
})
```

## Logging in tRPC routers

Resolve the logger from the container for one-off logging in procedures:

```ts
import { Logger } from '@cruzjs/core';

export const adminRouter = router({
  dangerousReset: orgProcedure.mutation(async ({ ctx }) => {
    const logger = ctx.container.get(Logger);

    logger.warning('Admin triggered dangerous reset', {
      orgId: ctx.org.orgId,
      userId: ctx.org.userId,
    });

    // ... perform reset
  }),
});
```

## Production tips

### Stream live logs on Cloudflare

```bash
npx wrangler pages deployment tail --project-name my-app
```

### Trace slow operations

```ts
async heavyOperation(orgId: string): Promise<Result> {
  const start = performance.now();
  const result = await this.doExpensiveWork(orgId);
  const durationMs = Math.round(performance.now() - start);

  this.logger.info('Operation completed', { orgId, durationMs });

  if (durationMs > 1000) {
    this.logger.warning('Operation exceeded 1s threshold', { orgId, durationMs });
  }

  return result;
}
```

### Enable debug logs temporarily in production

Set `LOG_LEVELS=<service-name>:debug` in your environment to increase verbosity for a specific service without changing the global level.
