/**
 * OTLP (OpenTelemetry Protocol) HTTP Tracing Adapter
 *
 * Sends spans to any OTLP-compatible backend (Jaeger, Zipkin, Datadog,
 * Honeycomb, Grafana Tempo, etc.) via HTTP POST using OTLP JSON format.
 *
 * Uses fetch (not binary protobuf) for CF Workers / edge compatibility.
 */

import { Injectable } from '@cruzjs/core/di';
import type { TracingAdapter } from '../tracing.adapter';
import type { Span, SpanKind, SpanEvent, SpanStatus, TraceContext } from '../tracing.types';

const W3C_TRACEPARENT_VERSION = '00';

function randomHex(bytes: number): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Convert a Date to OTLP nanosecond timestamp string */
function toNanos(date: Date): string {
  return String(BigInt(date.getTime()) * 1_000_000n);
}

/** Map CruzJS SpanKind to OTLP SpanKind integer */
function mapSpanKind(kind: SpanKind): number {
  switch (kind) {
    case 'internal':
      return 1;
    case 'server':
      return 2;
    case 'client':
      return 3;
    case 'producer':
      return 4;
    case 'consumer':
      return 5;
    default:
      return 0; // UNSPECIFIED
  }
}

/** Map CruzJS SpanStatus to OTLP StatusCode */
function mapStatusCode(status: SpanStatus): number {
  switch (status) {
    case 'ok':
      return 1;
    case 'error':
      return 2;
    default:
      return 0; // UNSET
  }
}

export type OTLPTracingAdapterOptions = {
  /** OTLP traces endpoint (e.g. https://api.honeycomb.io/v1/traces) */
  endpoint: string;
  /** Additional headers (e.g. auth tokens) */
  headers?: Record<string, string>;
  /** Service name to include in resource attributes */
  serviceName: string;
  /** Max number of spans to buffer before auto-flush (default: 100) */
  maxBatchSize?: number;
};

@Injectable()
export class OTLPTracingAdapter implements TracingAdapter {
  readonly name = 'otlp';
  private readonly buffer: Span[] = [];
  private readonly maxBatchSize: number;

  constructor(private readonly options: OTLPTracingAdapterOptions) {
    this.maxBatchSize = options.maxBatchSize ?? 100;
  }

  startSpan(
    name: string,
    opts?: {
      kind?: SpanKind;
      parentContext?: TraceContext;
      attributes?: Record<string, string | number | boolean>;
    },
  ): Span {
    const traceId = opts?.parentContext?.traceId ?? randomHex(16);
    const spanId = randomHex(8);
    const parentSpanId = opts?.parentContext?.spanId ?? null;

    const span: Span = {
      traceId,
      spanId,
      parentSpanId,
      name,
      kind: opts?.kind ?? 'internal',
      startTime: new Date(),
      endTime: null,
      attributes: { ...opts?.attributes },
      events: [],
      status: 'unset',
    };

    return span;
  }

  endSpan(span: Span, status?: SpanStatus, message?: string): void {
    span.endTime = new Date();
    if (status) span.status = status;
    if (message) span.statusMessage = message;

    this.buffer.push(span);

    if (this.buffer.length >= this.maxBatchSize) {
      // Fire-and-forget flush
      void this.flush();
    }
  }

  recordException(span: Span, error: Error): void {
    span.status = 'error';
    span.statusMessage = error.message;
    this.addEvent(span, {
      name: 'exception',
      attributes: {
        'exception.type': error.name,
        'exception.message': error.message,
        'exception.stacktrace': error.stack ?? '',
      },
    });
  }

  setAttributes(span: Span, attributes: Record<string, string | number | boolean>): void {
    Object.assign(span.attributes, attributes);
  }

  addEvent(span: Span, event: Omit<SpanEvent, 'timestamp'>): void {
    span.events.push({ ...event, timestamp: new Date() });
  }

  propagate(span: Span): Record<string, string> {
    const flags = '01';
    return {
      traceparent: `${W3C_TRACEPARENT_VERSION}-${span.traceId}-${span.spanId}-${flags}`,
    };
  }

  extract(headers: Record<string, string>): TraceContext | null {
    const traceparent = headers['traceparent'] ?? headers['Traceparent'];
    if (!traceparent) return null;

    const parts = traceparent.split('-');
    if (parts.length < 4) return null;

    const [_version, traceId, spanId, flagsHex] = parts;
    if (!traceId || !spanId) return null;

    return {
      traceId,
      spanId,
      traceFlags: parseInt(flagsHex, 16) || 0,
    };
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const spans = this.buffer.splice(0, this.buffer.length);
    const payload = this.buildOTLPPayload(spans);

    try {
      await fetch(this.options.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.options.headers,
        },
        body: JSON.stringify(payload),
      });
    } catch {
      // Tracing should never break the application
      // Re-buffer the spans for a potential retry is intentionally omitted
      // to avoid unbounded memory growth in degraded scenarios.
    }
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private buildOTLPPayload(spans: Span[]) {
    return {
      resourceSpans: [
        {
          resource: {
            attributes: [
              {
                key: 'service.name',
                value: { stringValue: this.options.serviceName },
              },
            ],
          },
          scopeSpans: [
            {
              scope: { name: '@cruzjs/monitor', version: '0.1.0' },
              spans: spans.map((span) => this.serializeSpan(span)),
            },
          ],
        },
      ],
    };
  }

  private serializeSpan(span: Span) {
    return {
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId ?? undefined,
      name: span.name,
      kind: mapSpanKind(span.kind),
      startTimeUnixNano: toNanos(span.startTime),
      endTimeUnixNano: span.endTime ? toNanos(span.endTime) : toNanos(new Date()),
      attributes: this.serializeAttributes(span.attributes),
      events: span.events.map((event) => ({
        name: event.name,
        timeUnixNano: toNanos(event.timestamp),
        attributes: event.attributes ? this.serializeAttributes(event.attributes) : [],
      })),
      status: {
        code: mapStatusCode(span.status),
        message: span.statusMessage ?? '',
      },
    };
  }

  private serializeAttributes(attrs: Record<string, string | number | boolean>) {
    return Object.entries(attrs).map(([key, value]) => {
      if (typeof value === 'string') {
        return { key, value: { stringValue: value } };
      }
      if (typeof value === 'number') {
        return Number.isInteger(value)
          ? { key, value: { intValue: String(value) } }
          : { key, value: { doubleValue: value } };
      }
      return { key, value: { boolValue: value } };
    });
  }
}
