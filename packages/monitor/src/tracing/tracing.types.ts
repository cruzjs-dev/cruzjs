/**
 * Distributed Tracing Types
 *
 * Core types for spans, traces, metrics, and DI tokens.
 */

export const SpanKind = {
  INTERNAL: 'internal',
  SERVER: 'server',
  CLIENT: 'client',
  PRODUCER: 'producer',
  CONSUMER: 'consumer',
} as const;
export type SpanKind = (typeof SpanKind)[keyof typeof SpanKind];

export const SpanStatus = {
  UNSET: 'unset',
  OK: 'ok',
  ERROR: 'error',
} as const;
export type SpanStatus = (typeof SpanStatus)[keyof typeof SpanStatus];

export interface SpanEvent {
  name: string;
  timestamp: Date;
  attributes?: Record<string, string | number | boolean>;
}

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  name: string;
  kind: SpanKind;
  startTime: Date;
  endTime: Date | null;
  attributes: Record<string, string | number | boolean>;
  events: SpanEvent[];
  status: SpanStatus;
  statusMessage?: string;
}

export interface TraceContext {
  traceId: string;
  spanId: string;
  traceFlags: number;
}

/** W3C Trace Context `traceparent` header fields */
export interface TraceParent {
  version: string;
  traceId: string;
  parentId: string;
  flags: number;
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

export const MetricType = {
  COUNTER: 'counter',
  HISTOGRAM: 'histogram',
  GAUGE: 'gauge',
} as const;
export type MetricType = (typeof MetricType)[keyof typeof MetricType];

export interface MetricDataPoint {
  name: string;
  type: MetricType;
  value: number;
  labels?: Record<string, string>;
  timestamp: Date;
}

// ─── DI Tokens ────────────────────────────────────────────────────────────────

export const TRACING_ADAPTER = Symbol.for('TRACING_ADAPTER');
export const METRIC_ADAPTER = Symbol.for('METRIC_ADAPTER');
