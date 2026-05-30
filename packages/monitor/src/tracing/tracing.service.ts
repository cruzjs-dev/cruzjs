/**
 * Tracing Service
 *
 * Central service for distributed tracing. Wraps the underlying
 * TracingAdapter and provides convenience methods for creating
 * spans, propagating context, and recording exceptions.
 *
 * Falls back to InMemoryTracingAdapter when no adapter is injected.
 */

import { Injectable, Inject, Optional } from '@cruzjs/core/di';
import type { TracingAdapter } from './tracing.adapter';
import type { Span, SpanKind, SpanStatus, TraceContext } from './tracing.types';
import { TRACING_ADAPTER } from './tracing.types';
import { InMemoryTracingAdapter } from './adapters/in-memory.tracing.adapter';

@Injectable()
export class TracingService {
  private readonly activeSpans = new Map<string, Span>();
  private readonly adapter: TracingAdapter;

  constructor(
    @Inject(TRACING_ADAPTER) @Optional() adapter?: TracingAdapter,
  ) {
    this.adapter = adapter ?? new InMemoryTracingAdapter();
  }

  /**
   * Start a new span and track it as active.
   */
  startSpan(
    name: string,
    options?: {
      kind?: SpanKind;
      parentContext?: TraceContext;
      attributes?: Record<string, string | number | boolean>;
    },
  ): Span {
    const span = this.adapter.startSpan(name, options);
    this.activeSpans.set(span.spanId, span);
    return span;
  }

  /**
   * End a span and remove it from the active set.
   */
  endSpan(span: Span, status?: SpanStatus, message?: string): void {
    this.adapter.endSpan(span, status, message);
    this.activeSpans.delete(span.spanId);
  }

  /**
   * Record an exception on a span. Sets status to ERROR.
   */
  recordException(span: Span, error: Error): void {
    this.adapter.recordException(span, error);
  }

  /**
   * Wrap an async function in a span. Automatically ends the span
   * on completion (OK) or exception (ERROR, re-thrown).
   */
  async trace<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    options?: {
      kind?: SpanKind;
      attributes?: Record<string, string | number | boolean>;
      parentContext?: TraceContext;
    },
  ): Promise<T> {
    const span = this.startSpan(name, options);
    try {
      const result = await fn(span);
      this.endSpan(span, 'ok');
      return result;
    } catch (error) {
      this.recordException(span, error instanceof Error ? error : new Error(String(error)));
      this.endSpan(span, 'error', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Return W3C traceparent propagation headers for the given span.
   */
  propagate(span: Span): Record<string, string> {
    return this.adapter.propagate(span);
  }

  /**
   * Extract a TraceContext from inbound request headers.
   */
  extract(headers: Record<string, string>): TraceContext | null {
    return this.adapter.extract(headers);
  }

  /**
   * Get the underlying adapter (for advanced use cases / testing).
   */
  getAdapter(): TracingAdapter {
    return this.adapter;
  }

  /**
   * Flush all buffered spans to the backend.
   */
  async flush(): Promise<void> {
    return this.adapter.flush();
  }
}
