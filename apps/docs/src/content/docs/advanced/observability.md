---
title: Observability
description: Error reporting, distributed tracing, and structured logging for CruzJS applications
---

CruzJS provides observability through three modules: error reporting for capturing unhandled exceptions, distributed tracing for request flow analysis, and structured logging for operational visibility.

## Error Reporting

### Setup

```typescript
// src/app.server.ts
import { registerModules } from '@cruzjs/core/framework/module-registry';
import { StartModule } from '@cruzjs/start/start.module';
import { ErrorReportingModule } from '@cruzjs/monitor/error-reporting';

registerModules([StartModule, ErrorReportingModule]);
```

### What Gets Captured

The module automatically catches unhandled errors and enriches them with request context:

- **User ID** -- the authenticated user, if any
- **Org ID** -- the current organization context
- **URL** -- the request URL
- **Method** -- HTTP method (GET, POST, etc.)
- **Request ID** -- correlation ID for tracing

Errors are forwarded to your configured error reporting service (Sentry, Honeybadger, etc.) via the OTLP pipeline or directly.

## Distributed Tracing

### Setup

```typescript
// src/app.server.ts
import { registerModules } from '@cruzjs/core/framework/module-registry';
import { StartModule } from '@cruzjs/start/start.module';
import { TracingModule } from '@cruzjs/monitor/tracing';

registerModules([StartModule, TracingModule]);
```

### Configuration

Set environment variables to connect to your OTLP-compatible tracing backend:

```bash
OTLP_ENDPOINT=https://api.honeycomb.io
OTLP_HEADERS=x-honeycomb-team=your-api-key
OTLP_SERVICE_NAME=my-cruzjs-app
```

### Platform Adapters

On Cloudflare, use `createCloudflareTracingAdapter` which selects the right backend automatically:

| Condition | Adapter |
|-----------|---------|
| `OTLP_ENDPOINT` is set | `OTLPTracingAdapter` -- sends spans to the configured endpoint |
| Development / no endpoint | `InMemoryTracingAdapter` -- stores spans in memory for debugging |

### Compatible Backends

Any OTLP-compatible tracing backend works:

| Service | `OTLP_ENDPOINT` | `OTLP_HEADERS` |
|---------|-----------------|-----------------|
| Honeycomb | `https://api.honeycomb.io` | `x-honeycomb-team=YOUR_KEY` |
| Jaeger | `http://jaeger:4318` | (none) |
| Grafana Tempo | `https://tempo.example.com` | `Authorization=Basic ...` |
| Sentry (via OTLP) | `https://oXXX.ingest.sentry.io/api/XXX/envelope/` | `sentry-trace=...` |

### Span Creation

The framework creates spans automatically for:

- tRPC procedure calls
- Database queries
- HTTP requests to external services
- Background job execution

## Structured Logging

CruzJS uses [Pino](https://getpino.io/) as its logging engine. See [Logging](/basics/logging/) for the full guide. Key points for observability:

### Log + trace correlation

When `TracingModule` is loaded alongside the Logger, `traceId` and `spanId` are automatically included in every log entry via `LogContext`. This lets you jump from a log line directly to the corresponding trace in Honeycomb, Grafana Tempo, or Jaeger.

No additional setup is required — the Logger reads trace context from `LogContext.getStore()` on every write.

### LogEntry shape

```typescript
type LogEntry = {
  level: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
  correlationId?: string;  // maps to requestId
  source?: string;         // service/namespace name
};
```

### Using the Logger

Inject via DI using `LOGGER_FACTORY` for pre-scoped child loggers:

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { LOGGER_FACTORY, type LoggerFactory } from '@cruzjs/core';

@Injectable()
export class InvoiceService {
  private readonly logger;

  constructor(@Inject(LOGGER_FACTORY) factory: LoggerFactory) {
    this.logger = factory('InvoiceService');
  }

  async create(invoiceId: string, amount: number): Promise<void> {
    this.logger.info('Invoice created', { invoiceId, amount });
  }

  async charge(invoiceId: string): Promise<void> {
    try {
      await this.paymentProvider.charge(invoiceId);
    } catch (err) {
      this.logger.error('Payment failed', err, { invoiceId });
    }
  }
}
```

### Platform behavior

| Platform | Output |
|----------|--------|
| Cloudflare | JSON via `console.log/error` — compatible with Logpush for forwarding to Datadog, Loki, etc. |
| Docker / self-hosted | Structured JSON to stdout — pipe to your log aggregator |
| Development | pino-pretty: colorized, human-readable output |

## Example: Honeycomb Setup

Full configuration for Honeycomb tracing and logging:

```typescript
// src/app.server.ts
import { registerModules } from '@cruzjs/core/framework/module-registry';
import { StartModule } from '@cruzjs/start/start.module';
import { TracingModule } from '@cruzjs/monitor/tracing';
import { ErrorReportingModule } from '@cruzjs/monitor/error-reporting';

registerModules([StartModule, TracingModule, ErrorReportingModule]);
```

```bash
# .dev.vars or environment variables
OTLP_ENDPOINT=https://api.honeycomb.io
OTLP_HEADERS=x-honeycomb-team=your-api-key
OTLP_SERVICE_NAME=my-app
```

With this configuration, every tRPC call, database query, and background job produces a trace span in Honeycomb. Errors are annotated with user and request context for fast debugging.
