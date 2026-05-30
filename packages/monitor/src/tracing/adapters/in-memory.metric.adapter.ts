/**
 * In-Memory Metric Adapter
 *
 * Default adapter that stores metrics in memory for local development
 * and testing.
 */

import { Injectable } from '@cruzjs/core/di';
import type { MetricAdapter } from '../tracing.adapter';
import type { MetricDataPoint } from '../tracing.types';

@Injectable()
export class InMemoryMetricAdapter implements MetricAdapter {
  readonly name = 'in-memory';
  private readonly metrics: MetricDataPoint[] = [];

  increment(name: string, value = 1, labels?: Record<string, string>): void {
    this.metrics.push({
      name,
      type: 'counter',
      value,
      labels,
      timestamp: new Date(),
    });
  }

  histogram(name: string, value: number, labels?: Record<string, string>): void {
    this.metrics.push({
      name,
      type: 'histogram',
      value,
      labels,
      timestamp: new Date(),
    });
  }

  gauge(name: string, value: number, labels?: Record<string, string>): void {
    this.metrics.push({
      name,
      type: 'gauge',
      value,
      labels,
      timestamp: new Date(),
    });
  }

  async flush(): Promise<void> {
    // In-memory — nothing to flush
  }

  // ─── Dev/Testing Helpers ──────────────────────────────────────────────────

  /** Get all recorded metrics */
  getMetrics(): MetricDataPoint[] {
    return [...this.metrics];
  }

  /** Clear all recorded metrics */
  clearMetrics(): void {
    this.metrics.length = 0;
  }
}
