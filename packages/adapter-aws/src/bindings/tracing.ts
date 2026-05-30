/**
 * AWS Tracing Adapter
 *
 * Uses OTLP adapter for trace export. For metrics, uses CloudWatch EMF
 * (Embedded Metric Format) if AWS_CLOUDWATCH_METRICS=true, else in-memory.
 *
 * OTLP works well with AWS X-Ray via the ADOT (AWS Distro for OpenTelemetry)
 * collector sidecar, or directly with third-party backends.
 */

import type { TracingAdapter, MetricAdapter } from '@cruzjs/monitor/tracing';
import {
  InMemoryTracingAdapter,
  InMemoryMetricAdapter,
  OTLPTracingAdapter,
} from '@cruzjs/monitor/tracing';

/**
 * Create an AWS-appropriate TracingAdapter.
 *
 * - If `OTLP_ENDPOINT` is set, uses OTLPTracingAdapter.
 * - Otherwise, uses InMemoryTracingAdapter.
 */
export function createAWSTracingAdapter(): TracingAdapter {
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
      serviceName: process.env.OTLP_SERVICE_NAME ?? 'cruzjs-aws',
    });
  }

  return new InMemoryTracingAdapter();
}

/**
 * Create an AWS-appropriate MetricAdapter.
 *
 * Currently returns in-memory. CloudWatch EMF integration can be added
 * by writing JSON to stdout in the EMF format when AWS_CLOUDWATCH_METRICS=true.
 */
export function createAWSMetricAdapter(): MetricAdapter {
  // TODO: CloudWatch EMF adapter when AWS_CLOUDWATCH_METRICS=true
  return new InMemoryMetricAdapter();
}
