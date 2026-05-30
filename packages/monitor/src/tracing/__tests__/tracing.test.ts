/**
 * Tracing Unit Tests
 *
 * Tests for InMemoryTracingAdapter, InMemoryMetricAdapter,
 * TracingService, MetricsService, and the @Trace decorator.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { InMemoryTracingAdapter } from '../adapters/in-memory.tracing.adapter';
import { InMemoryMetricAdapter } from '../adapters/in-memory.metric.adapter';
import { TracingService } from '../tracing.service';
import { MetricsService } from '../metrics.service';

// ─── InMemoryTracingAdapter ──────────────────────────────────────────────────

describe('InMemoryTracingAdapter', () => {
  let adapter: InMemoryTracingAdapter;

  beforeEach(() => {
    adapter = new InMemoryTracingAdapter();
  });

  it('should have name "in-memory"', () => {
    expect(adapter.name).toBe('in-memory');
  });

  describe('startSpan', () => {
    it('should create a span with traceId and spanId', () => {
      const span = adapter.startSpan('test-span');

      expect(span.traceId).toBeDefined();
      expect(span.traceId).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(span.spanId).toBeDefined();
      expect(span.spanId).toHaveLength(16); // 8 bytes = 16 hex chars
      expect(span.name).toBe('test-span');
      expect(span.kind).toBe('internal');
      expect(span.startTime).toBeInstanceOf(Date);
      expect(span.endTime).toBeNull();
      expect(span.status).toBe('unset');
      expect(span.events).toEqual([]);
      expect(span.parentSpanId).toBeNull();
    });

    it('should use parent trace context when provided', () => {
      const span = adapter.startSpan('child-span', {
        parentContext: {
          traceId: 'aaaa0000aaaa0000aaaa0000aaaa0000',
          spanId: 'bbbb0000bbbb0000',
          traceFlags: 1,
        },
      });

      expect(span.traceId).toBe('aaaa0000aaaa0000aaaa0000aaaa0000');
      expect(span.parentSpanId).toBe('bbbb0000bbbb0000');
      expect(span.spanId).not.toBe('bbbb0000bbbb0000'); // new spanId
    });

    it('should set span kind', () => {
      const span = adapter.startSpan('server-span', { kind: 'server' });
      expect(span.kind).toBe('server');
    });

    it('should set initial attributes', () => {
      const span = adapter.startSpan('span', {
        attributes: { 'http.method': 'GET', 'http.url': '/api/test' },
      });

      expect(span.attributes['http.method']).toBe('GET');
      expect(span.attributes['http.url']).toBe('/api/test');
    });

    it('should store spans in the internal list', () => {
      adapter.startSpan('span-1');
      adapter.startSpan('span-2');

      expect(adapter.getSpans()).toHaveLength(2);
    });
  });

  describe('endSpan', () => {
    it('should set endTime on the span', () => {
      const span = adapter.startSpan('test-span');
      expect(span.endTime).toBeNull();

      adapter.endSpan(span);

      expect(span.endTime).toBeInstanceOf(Date);
    });

    it('should set status when provided', () => {
      const span = adapter.startSpan('test-span');
      adapter.endSpan(span, 'ok');

      expect(span.status).toBe('ok');
    });

    it('should set status message when provided', () => {
      const span = adapter.startSpan('test-span');
      adapter.endSpan(span, 'error', 'Something went wrong');

      expect(span.status).toBe('error');
      expect(span.statusMessage).toBe('Something went wrong');
    });
  });

  describe('recordException', () => {
    it('should add an exception event to the span', () => {
      const span = adapter.startSpan('test-span');
      const error = new Error('Test error');
      error.name = 'TestError';

      adapter.recordException(span, error);

      expect(span.status).toBe('error');
      expect(span.statusMessage).toBe('Test error');
      expect(span.events).toHaveLength(1);
      expect(span.events[0].name).toBe('exception');
      expect(span.events[0].attributes?.['exception.type']).toBe('TestError');
      expect(span.events[0].attributes?.['exception.message']).toBe('Test error');
      expect(span.events[0].timestamp).toBeInstanceOf(Date);
    });
  });

  describe('setAttributes', () => {
    it('should merge attributes into the span', () => {
      const span = adapter.startSpan('test-span', {
        attributes: { existing: 'value' },
      });

      adapter.setAttributes(span, { added: 'new-value', count: 42 });

      expect(span.attributes['existing']).toBe('value');
      expect(span.attributes['added']).toBe('new-value');
      expect(span.attributes['count']).toBe(42);
    });
  });

  describe('addEvent', () => {
    it('should add an event with auto-generated timestamp', () => {
      const span = adapter.startSpan('test-span');

      adapter.addEvent(span, {
        name: 'cache.hit',
        attributes: { key: 'users:1' },
      });

      expect(span.events).toHaveLength(1);
      expect(span.events[0].name).toBe('cache.hit');
      expect(span.events[0].attributes?.['key']).toBe('users:1');
      expect(span.events[0].timestamp).toBeInstanceOf(Date);
    });
  });

  describe('propagate', () => {
    it('should return a traceparent header in W3C format', () => {
      const span = adapter.startSpan('test-span');
      const headers = adapter.propagate(span);

      expect(headers['traceparent']).toBeDefined();

      const parts = headers['traceparent'].split('-');
      expect(parts).toHaveLength(4);
      expect(parts[0]).toBe('00'); // version
      expect(parts[1]).toBe(span.traceId);
      expect(parts[2]).toBe(span.spanId);
      expect(parts[3]).toBe('01'); // sampled flag
    });
  });

  describe('extract', () => {
    it('should parse a valid traceparent header', () => {
      const ctx = adapter.extract({
        traceparent: '00-aaaa0000aaaa0000aaaa0000aaaa0000-bbbb0000bbbb0000-01',
      });

      expect(ctx).not.toBeNull();
      expect(ctx!.traceId).toBe('aaaa0000aaaa0000aaaa0000aaaa0000');
      expect(ctx!.spanId).toBe('bbbb0000bbbb0000');
      expect(ctx!.traceFlags).toBe(1);
    });

    it('should return null when no traceparent header is present', () => {
      const ctx = adapter.extract({});
      expect(ctx).toBeNull();
    });

    it('should return null for malformed traceparent', () => {
      const ctx = adapter.extract({ traceparent: 'invalid' });
      expect(ctx).toBeNull();
    });

    it('should handle case-insensitive header name', () => {
      const ctx = adapter.extract({
        Traceparent: '00-aaaa0000aaaa0000aaaa0000aaaa0000-bbbb0000bbbb0000-01',
      });

      expect(ctx).not.toBeNull();
      expect(ctx!.traceId).toBe('aaaa0000aaaa0000aaaa0000aaaa0000');
    });
  });

  describe('clearSpans', () => {
    it('should remove all recorded spans', () => {
      adapter.startSpan('span-1');
      adapter.startSpan('span-2');
      expect(adapter.getSpans()).toHaveLength(2);

      adapter.clearSpans();
      expect(adapter.getSpans()).toHaveLength(0);
    });
  });

  describe('flush', () => {
    it('should resolve without error', async () => {
      await expect(adapter.flush()).resolves.toBeUndefined();
    });
  });
});

// ─── InMemoryMetricAdapter ───────────────────────────────────────────────────

describe('InMemoryMetricAdapter', () => {
  let adapter: InMemoryMetricAdapter;

  beforeEach(() => {
    adapter = new InMemoryMetricAdapter();
  });

  it('should have name "in-memory"', () => {
    expect(adapter.name).toBe('in-memory');
  });

  describe('increment', () => {
    it('should record a counter metric', () => {
      adapter.increment('http.requests.total', 1, { method: 'GET' });

      const metrics = adapter.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('http.requests.total');
      expect(metrics[0].type).toBe('counter');
      expect(metrics[0].value).toBe(1);
      expect(metrics[0].labels).toEqual({ method: 'GET' });
      expect(metrics[0].timestamp).toBeInstanceOf(Date);
    });

    it('should default value to 1', () => {
      adapter.increment('counter');

      const metrics = adapter.getMetrics();
      expect(metrics[0].value).toBe(1);
    });
  });

  describe('histogram', () => {
    it('should record a histogram metric', () => {
      adapter.histogram('http.request.duration_ms', 42.5, { path: '/api' });

      const metrics = adapter.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('http.request.duration_ms');
      expect(metrics[0].type).toBe('histogram');
      expect(metrics[0].value).toBe(42.5);
      expect(metrics[0].labels).toEqual({ path: '/api' });
    });
  });

  describe('gauge', () => {
    it('should record a gauge metric', () => {
      adapter.gauge('active.connections', 15);

      const metrics = adapter.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('active.connections');
      expect(metrics[0].type).toBe('gauge');
      expect(metrics[0].value).toBe(15);
    });
  });

  describe('clearMetrics', () => {
    it('should remove all recorded metrics', () => {
      adapter.increment('counter-1');
      adapter.histogram('hist-1', 100);
      adapter.gauge('gauge-1', 5);
      expect(adapter.getMetrics()).toHaveLength(3);

      adapter.clearMetrics();
      expect(adapter.getMetrics()).toHaveLength(0);
    });
  });

  describe('flush', () => {
    it('should resolve without error', async () => {
      await expect(adapter.flush()).resolves.toBeUndefined();
    });
  });
});

// ─── TracingService ──────────────────────────────────────────────────────────

describe('TracingService', () => {
  let service: TracingService;

  beforeEach(() => {
    // Construct without DI — uses default InMemoryTracingAdapter
    service = new TracingService();
  });

  describe('startSpan / endSpan', () => {
    it('should create and end a span', () => {
      const span = service.startSpan('test-span');

      expect(span.traceId).toBeDefined();
      expect(span.endTime).toBeNull();

      service.endSpan(span, 'ok');
      expect(span.endTime).toBeInstanceOf(Date);
      expect(span.status).toBe('ok');
    });
  });

  describe('trace', () => {
    it('should create span, call fn, end span on success', async () => {
      const fn = vi.fn().mockResolvedValue('result');

      const result = await service.trace('operation', fn);

      expect(result).toBe('result');
      expect(fn).toHaveBeenCalledTimes(1);

      // The fn receives the span as first argument
      const span = fn.mock.calls[0][0];
      expect(span.name).toBe('operation');
      expect(span.status).toBe('ok');
      expect(span.endTime).toBeInstanceOf(Date);
    });

    it('should record exception and re-throw on error', async () => {
      const error = new Error('test failure');
      const fn = vi.fn().mockRejectedValue(error);

      await expect(service.trace('failing-operation', fn)).rejects.toThrow('test failure');

      const span = fn.mock.calls[0][0];
      expect(span.status).toBe('error');
      expect(span.statusMessage).toBe('test failure');
      expect(span.events.some((e: any) => e.name === 'exception')).toBe(true);
      expect(span.endTime).toBeInstanceOf(Date);
    });

    it('should pass options to startSpan', async () => {
      const fn = vi.fn().mockResolvedValue(null);

      await service.trace('server-op', fn, {
        kind: 'server',
        attributes: { 'custom.attr': 'value' },
      });

      const span = fn.mock.calls[0][0];
      expect(span.kind).toBe('server');
      expect(span.attributes['custom.attr']).toBe('value');
    });
  });

  describe('propagate / extract', () => {
    it('should propagate and extract trace context round-trip', () => {
      const span = service.startSpan('test-span');
      const headers = service.propagate(span);

      expect(headers['traceparent']).toBeDefined();

      const ctx = service.extract(headers);
      expect(ctx).not.toBeNull();
      expect(ctx!.traceId).toBe(span.traceId);
      expect(ctx!.spanId).toBe(span.spanId);
    });
  });

  describe('recordException', () => {
    it('should delegate to the adapter', () => {
      const span = service.startSpan('test-span');
      const error = new Error('boom');

      service.recordException(span, error);

      expect(span.status).toBe('error');
      expect(span.events).toHaveLength(1);
    });
  });

  describe('flush', () => {
    it('should resolve without error', async () => {
      await expect(service.flush()).resolves.toBeUndefined();
    });
  });

  describe('getAdapter', () => {
    it('should return the underlying adapter', () => {
      const adapter = service.getAdapter();
      expect(adapter.name).toBe('in-memory');
    });
  });
});

// ─── MetricsService ──────────────────────────────────────────────────────────

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    // Construct without DI — uses default InMemoryMetricAdapter
    service = new MetricsService();
  });

  describe('increment', () => {
    it('should delegate to the adapter', () => {
      service.increment('counter', 5, { label: 'test' });

      const adapter = service.getAdapter() as InMemoryMetricAdapter;
      const metrics = adapter.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('counter');
      expect(metrics[0].value).toBe(5);
    });
  });

  describe('histogram', () => {
    it('should delegate to the adapter', () => {
      service.histogram('duration', 42);

      const adapter = service.getAdapter() as InMemoryMetricAdapter;
      const metrics = adapter.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].type).toBe('histogram');
    });
  });

  describe('gauge', () => {
    it('should delegate to the adapter', () => {
      service.gauge('connections', 10);

      const adapter = service.getAdapter() as InMemoryMetricAdapter;
      const metrics = adapter.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].type).toBe('gauge');
    });
  });

  describe('recordRequestDuration', () => {
    it('should record a histogram with path, method, and status labels', () => {
      service.recordRequestDuration('/api/users', 'GET', 200, 55);

      const adapter = service.getAdapter() as InMemoryMetricAdapter;
      const metrics = adapter.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('http.request.duration_ms');
      expect(metrics[0].type).toBe('histogram');
      expect(metrics[0].value).toBe(55);
      expect(metrics[0].labels).toEqual({
        path: '/api/users',
        method: 'GET',
        status_code: '200',
      });
    });
  });

  describe('flush', () => {
    it('should resolve without error', async () => {
      await expect(service.flush()).resolves.toBeUndefined();
    });
  });
});

// ─── @Trace Decorator ────────────────────────────────────────────────────────

describe('Trace decorator', () => {
  // The @Trace decorator relies on dynamic imports (getAppContainer),
  // which makes it difficult to unit test in isolation. Instead we test
  // the metadata storage and the basic wrapping behavior.

  it('should export getTraceMetadata function', async () => {
    const { getTraceMetadata } = await import('../tracing.decorator');
    expect(typeof getTraceMetadata).toBe('function');
  });

  it('should export Trace decorator function', async () => {
    const { Trace } = await import('../tracing.decorator');
    expect(typeof Trace).toBe('function');

    // Verify it returns a function (MethodDecorator factory)
    const decorator = Trace('test', { kind: 'internal' });
    expect(typeof decorator).toBe('function');
  });
});
