/**
 * Azure Tracing Adapter
 *
 * Uses OTLP adapter for trace export. Works with Azure Monitor / Application
 * Insights via the OTLP exporter or directly with third-party backends.
 *
 * For metrics, can use Application Insights REST API in the future.
 */

import type { TracingAdapter, MetricAdapter } from '@cruzjs/monitor/tracing';
import {
  InMemoryTracingAdapter,
  InMemoryMetricAdapter,
  OTLPTracingAdapter,
} from '@cruzjs/monitor/tracing';

/**
 * Create an Azure-appropriate TracingAdapter.
 *
 * - If `OTLP_ENDPOINT` is set, uses OTLPTracingAdapter.
 * - Otherwise, uses InMemoryTracingAdapter.
 */
export function createAzureTracingAdapter(): TracingAdapter {
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
      serviceName: process.env.OTLP_SERVICE_NAME ?? 'cruzjs-azure',
    });
  }

  return new InMemoryTracingAdapter();
}

/**
 * Create an Azure-appropriate MetricAdapter.
 *
 * Currently returns in-memory. Application Insights REST API
 * integration can be added when needed.
 */
export function createAzureMetricAdapter(): MetricAdapter {
  // TODO: Application Insights REST API adapter
  return new InMemoryMetricAdapter();
}
