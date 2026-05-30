/**
 * Cloudflare Tracing Adapter
 *
 * Uses OTLP adapter if OTLP_ENDPOINT env is set, else falls back to in-memory.
 * Also emits Cloudflare Analytics Engine metrics if ANALYTICS binding exists.
 */

import type { TracingAdapter, MetricAdapter } from '@cruzjs/monitor/tracing';
import {
  InMemoryTracingAdapter,
  InMemoryMetricAdapter,
  OTLPTracingAdapter,
} from '@cruzjs/monitor/tracing';

/**
 * Create a Cloudflare-appropriate TracingAdapter.
 *
 * - If `OTLP_ENDPOINT` is set, uses OTLPTracingAdapter (sends spans via HTTP).
 * - Otherwise, uses InMemoryTracingAdapter (local dev).
 */
export function createCloudflareTracingAdapter(env?: Record<string, unknown>): TracingAdapter {
  const endpoint = (env?.OTLP_ENDPOINT as string) ?? process.env.OTLP_ENDPOINT;
  if (endpoint) {
    const headersRaw = (env?.OTLP_HEADERS as string) ?? process.env.OTLP_HEADERS ?? '';
    const headers: Record<string, string> = {};
    if (headersRaw) {
      for (const pair of headersRaw.split(',')) {
        const [key, ...rest] = pair.split('=');
        if (key && rest.length > 0) {
          headers[key.trim()] = rest.join('=').trim();
        }
      }
    }

    const serviceName =
      (env?.OTLP_SERVICE_NAME as string) ??
      process.env.OTLP_SERVICE_NAME ??
      'cruzjs-cloudflare';

    return new OTLPTracingAdapter({ endpoint, headers, serviceName });
  }

  return new InMemoryTracingAdapter();
}

/**
 * Create a Cloudflare-appropriate MetricAdapter.
 *
 * Currently returns in-memory. In the future, this could emit to
 * Cloudflare Analytics Engine if the ANALYTICS binding is available.
 */
export function createCloudflareMetricAdapter(_env?: Record<string, unknown>): MetricAdapter {
  // TODO: If ANALYTICS binding exists, use CloudflareAnalyticsEngineMetricAdapter
  return new InMemoryMetricAdapter();
}
