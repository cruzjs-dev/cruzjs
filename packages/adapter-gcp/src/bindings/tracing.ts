/**
 * GCP Tracing Adapter
 *
 * Uses OTLP adapter for trace export. Works with Google Cloud Trace
 * via the OpenTelemetry Collector or directly with third-party backends.
 *
 * For metrics, can use Cloud Monitoring REST API in the future.
 */

import type { TracingAdapter, MetricAdapter } from '@cruzjs/monitor/tracing';
import {
  InMemoryTracingAdapter,
  InMemoryMetricAdapter,
  OTLPTracingAdapter,
} from '@cruzjs/monitor/tracing';

/**
 * Create a GCP-appropriate TracingAdapter.
 *
 * - If `OTLP_ENDPOINT` is set, uses OTLPTracingAdapter.
 * - Otherwise, uses InMemoryTracingAdapter.
 */
export function createGCPTracingAdapter(): TracingAdapter {
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
      serviceName: process.env.OTLP_SERVICE_NAME ?? 'cruzjs-gcp',
    });
  }

  return new InMemoryTracingAdapter();
}

/**
 * Create a GCP-appropriate MetricAdapter.
 *
 * Currently returns in-memory. Cloud Monitoring REST API integration
 * can be added when needed.
 */
export function createGCPMetricAdapter(): MetricAdapter {
  // TODO: Cloud Monitoring REST API adapter
  return new InMemoryMetricAdapter();
}
