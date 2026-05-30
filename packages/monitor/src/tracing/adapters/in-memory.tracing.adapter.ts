/**
 * In-Memory Tracing Adapter
 *
 * Default adapter that stores spans in memory for local development
 * and testing. Implements W3C Trace Context propagation.
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

@Injectable()
export class InMemoryTracingAdapter implements TracingAdapter {
  readonly name = 'in-memory';
  private readonly spans: Span[] = [];

  startSpan(
    name: string,
    options?: {
      kind?: SpanKind;
      parentContext?: TraceContext;
      attributes?: Record<string, string | number | boolean>;
    },
  ): Span {
    const traceId = options?.parentContext?.traceId ?? randomHex(16);
    const spanId = randomHex(8);
    const parentSpanId = options?.parentContext?.spanId ?? null;

    const span: Span = {
      traceId,
      spanId,
      parentSpanId,
      name,
      kind: options?.kind ?? 'internal',
      startTime: new Date(),
      endTime: null,
      attributes: { ...options?.attributes },
      events: [],
      status: 'unset',
    };

    this.spans.push(span);
    return span;
  }

  endSpan(span: Span, status?: SpanStatus, message?: string): void {
    span.endTime = new Date();
    if (status) {
      span.status = status;
    }
    if (message) {
      span.statusMessage = message;
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
    span.events.push({
      ...event,
      timestamp: new Date(),
    });
  }

  /**
   * Build a W3C `traceparent` header from the given span.
   * Format: `{version}-{traceId}-{spanId}-{flags}`
   */
  propagate(span: Span): Record<string, string> {
    const flags = '01'; // sampled
    return {
      traceparent: `${W3C_TRACEPARENT_VERSION}-${span.traceId}-${span.spanId}-${flags}`,
    };
  }

  /**
   * Parse a W3C `traceparent` header into a TraceContext.
   */
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
    // In-memory — nothing to flush
  }

  // ─── Dev/Testing Helpers ──────────────────────────────────────────────────

  /** Get all recorded spans */
  getSpans(): Span[] {
    return [...this.spans];
  }

  /** Clear all recorded spans */
  clearSpans(): void {
    this.spans.length = 0;
  }
}
