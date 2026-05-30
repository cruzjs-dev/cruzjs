/**
 * Tracing tRPC Middleware
 *
 * Creates a span per tRPC request, propagates trace context from
 * inbound headers, and records request duration metrics.
 */

import type { TracingService } from './tracing.service';
import type { MetricsService } from './metrics.service';

/**
 * Create a tRPC middleware that traces each procedure call.
 *
 * @param tracingService - The TracingService instance
 * @param metricsService - Optional MetricsService for recording duration metrics
 *
 * @example
 * ```typescript
 * const traced = tracingMiddleware(tracingService, metricsService);
 *
 * export const myProcedure = protectedProcedure
 *   .use(traced)
 *   .query(async ({ ctx }) => { ... });
 * ```
 */
export function tracingMiddleware(
  tracingService: TracingService,
  metricsService?: MetricsService,
) {
  return async function tracing(opts: { ctx: any; path: string; type: string; next: Function }) {
    const startTime = Date.now();

    // Extract trace context from inbound request headers
    let parentContext = null;
    const request = opts.ctx.request as Request | undefined;
    if (request) {
      const headers: Record<string, string> = {};
      request.headers.forEach((value, key) => {
        headers[key] = value;
      });
      parentContext = tracingService.extract(headers);
    }

    const span = tracingService.startSpan(`trpc.${opts.path}`, {
      kind: 'server',
      parentContext: parentContext ?? undefined,
      attributes: {
        'rpc.system': 'trpc',
        'rpc.method': opts.path,
        'rpc.type': opts.type,
      },
    });

    try {
      const result = await opts.next({
        ctx: {
          ...opts.ctx,
          traceContext: {
            traceId: span.traceId,
            spanId: span.spanId,
            traceFlags: 1,
          },
        },
      });

      tracingService.endSpan(span, 'ok');

      const durationMs = Date.now() - startTime;
      metricsService?.recordRequestDuration(opts.path, opts.type, 200, durationMs);
      metricsService?.increment('trpc.requests.total', 1, {
        path: opts.path,
        type: opts.type,
        status: 'ok',
      });

      return result;
    } catch (error) {
      tracingService.recordException(
        span,
        error instanceof Error ? error : new Error(String(error)),
      );
      tracingService.endSpan(span, 'error', error instanceof Error ? error.message : String(error));

      const durationMs = Date.now() - startTime;
      metricsService?.recordRequestDuration(opts.path, opts.type, 500, durationMs);
      metricsService?.increment('trpc.requests.total', 1, {
        path: opts.path,
        type: opts.type,
        status: 'error',
      });

      throw error;
    }
  };
}
