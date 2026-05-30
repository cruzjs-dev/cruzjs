/**
 * Docker / Self-Hosted Tracing Adapter
 *
 * Uses OTLP adapter if OTLP_ENDPOINT is set, else in-memory.
 *
 * For Jaeger: set OTLP_ENDPOINT=http://jaeger:4318/v1/traces
 * For Grafana Tempo: set OTLP_ENDPOINT=http://tempo:4318/v1/traces
 * For Zipkin: use the Zipkin OTLP receiver endpoint
 */

import type { TracingAdapter, MetricAdapter } from '@cruzjs/monitor/tracing';
import {
  InMemoryTracingAdapter,
  InMemoryMetricAdapter,
  OTLPTracingAdapter,
} from '@cruzjs/monitor/tracing';

/**
 * Create a Docker-appropriate TracingAdapter.
 *
 * - If `OTLP_ENDPOINT` is set, uses OTLPTracingAdapter.
 * - Otherwise, uses InMemoryTracingAdapter.
 */
export function createDockerTracingAdapter(): TracingAdapter {
  const endpoint = process.env.OTLP_ENDPOINT;
  if (endpoint) {
    const headersRaw = process.env.OTLP_HEADERS ?? '';
    const headers: Record<string, string> = {};
    if (headersRaw) {
      for (const pair of headersRaw.split(',')) {
        const [key, ...rest] = pair.split('=');
        if (key && rest.length > 0) {
          headers[key.trim()] = rest.join('=').trim();
        }
      }
    }

    return new OTLPTracingAdapter({
      endpoint,
      headers,
      serviceName: process.env.OTLP_SERVICE_NAME ?? 'cruzjs-docker',
    });
  }

  return new InMemoryTracingAdapter();
}

/**
 * Create a Docker-appropriate MetricAdapter.
 *
 * Returns in-memory. In production, metrics can be exported via OTLP
 * to Prometheus, Grafana, or similar backends.
 */
export function createDockerMetricAdapter(): MetricAdapter {
  return new InMemoryMetricAdapter();
}
