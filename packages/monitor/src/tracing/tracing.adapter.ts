/**
 * Tracing & Metric Adapter Interfaces
 *
 * Provider-agnostic interfaces for distributed tracing backends.
 * Implementations may use OTLP, Cloudflare Analytics Engine, CloudWatch, etc.
 */

import type { Span, SpanKind, SpanStatus, SpanEvent, TraceContext } from './tracing.types';

export interface TracingAdapter {
  readonly name: string;

  /** Start a new span, optionally parented to an existing trace context */
  startSpan(
    name: string,
    options?: {
      kind?: SpanKind;
      parentContext?: TraceContext;
      attributes?: Record<string, string | number | boolean>;
    },
  ): Span;

  /** End a span and record its duration */
  endSpan(span: Span, status?: SpanStatus, message?: string): void;

  /** Record an exception on a span */
  recordException(span: Span, error: Error): void;

  /** Set attributes on an active span */
  setAttributes(span: Span, attributes: Record<string, string | number | boolean>): void;

  /** Add an event to an active span */
  addEvent(span: Span, event: Omit<SpanEvent, 'timestamp'>): void;

  /** Return W3C Trace Context propagation headers for the given span */
  propagate(span: Span): Record<string, string>;

  /** Extract a TraceContext from inbound headers (returns null if not present) */
  extract(headers: Record<string, string>): TraceContext | null;

  /** Flush any buffered spans to the backend */
  flush(): Promise<void>;
}

export interface MetricAdapter {
  readonly name: string;

  /** Increment a counter metric */
  increment(name: string, value?: number, labels?: Record<string, string>): void;

  /** Record a histogram observation */
  histogram(name: string, value: number, labels?: Record<string, string>): void;

  /** Set a gauge value */
  gauge(name: string, value: number, labels?: Record<string, string>): void;

  /** Flush any buffered metrics to the backend */
  flush(): Promise<void>;
}
