/**
 * DigitalOcean Tracing Adapter
 *
 * Uses OTLP adapter for trace export. DigitalOcean does not have a native
 * tracing service, so OTLP is the primary export path (e.g., to Datadog,
 * Honeycomb, or a self-hosted Jaeger).
 */

import type { TracingAdapter, MetricAdapter } from '@cruzjs/monitor/tracing';
import {
  InMemoryTracingAdapter,
  InMemoryMetricAdapter,
  OTLPTracingAdapter,
} from '@cruzjs/monitor/tracing';

/**
 * Create a DigitalOcean-appropriate TracingAdapter.
 *
 * - If `OTLP_ENDPOINT` is set, uses OTLPTracingAdapter.
 * - Otherwise, uses InMemoryTracingAdapter.
 */
export function createDOTracingAdapter(): TracingAdapter {
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
      serviceName: process.env.OTLP_SERVICE_NAME ?? 'cruzjs-digitalocean',
    });
  }

  return new InMemoryTracingAdapter();
}

/**
 * Create a DigitalOcean-appropriate MetricAdapter.
 *
 * Returns in-memory. Metrics export is handled via OTLP to an external backend.
 */
export function createDOMetricAdapter(): MetricAdapter {
  return new InMemoryMetricAdapter();
}
