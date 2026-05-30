/**
 * Metrics Service
 *
 * Central service for application metrics (counters, histograms, gauges).
 * Wraps the underlying MetricAdapter with convenience methods.
 *
 * Falls back to InMemoryMetricAdapter when no adapter is injected.
 */

import { Injectable, Inject, Optional } from '@cruzjs/core/di';
import type { MetricAdapter } from './tracing.adapter';
import { METRIC_ADAPTER } from './tracing.types';
import { InMemoryMetricAdapter } from './adapters/in-memory.metric.adapter';

@Injectable()
export class MetricsService {
  private readonly adapter: MetricAdapter;

  constructor(
    @Inject(METRIC_ADAPTER) @Optional() adapter?: MetricAdapter,
  ) {
    this.adapter = adapter ?? new InMemoryMetricAdapter();
  }

  /**
   * Increment a counter metric.
   */
  increment(name: string, value = 1, labels?: Record<string, string>): void {
    this.adapter.increment(name, value, labels);
  }

  /**
   * Record a histogram observation.
   */
  histogram(name: string, value: number, labels?: Record<string, string>): void {
    this.adapter.histogram(name, value, labels);
  }

  /**
   * Set a gauge value.
   */
  gauge(name: string, value: number, labels?: Record<string, string>): void {
    this.adapter.gauge(name, value, labels);
  }

  /**
   * Convenience method to record HTTP request duration as a histogram.
   */
  recordRequestDuration(
    path: string,
    method: string,
    statusCode: number,
    durationMs: number,
  ): void {
    this.adapter.histogram('http.request.duration_ms', durationMs, {
      path,
      method,
      status_code: String(statusCode),
    });
  }

  /**
   * Get the underlying adapter (for advanced use cases / testing).
   */
  getAdapter(): MetricAdapter {
    return this.adapter;
  }

  /**
   * Flush all buffered metrics to the backend.
   */
  async flush(): Promise<void> {
    return this.adapter.flush();
  }
}
