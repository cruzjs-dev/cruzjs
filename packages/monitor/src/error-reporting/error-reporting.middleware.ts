/**
 * Error Reporting Middleware
 *
 * tRPC middleware that auto-captures unhandled errors with request context.
 * Also provides a fetch handler wrapper for catching uncaught exceptions
 * at the HTTP level.
 */

import { TRPCError } from '@trpc/server';
import type { ErrorReportingService } from './error-reporting.service';
import { ErrorSeverity } from './error-reporting.types';

/**
 * Create a tRPC middleware that captures unhandled errors.
 *
 * Errors are reported with full request context (user, org, request URL).
 * The original error is re-thrown after capture so tRPC error handling
 * continues normally.
 *
 * @example
 * ```typescript
 * const withErrors = errorReportingMiddleware(errorReportingService);
 *
 * export const myProcedure = protectedProcedure
 *   .use(withErrors)
 *   .query(async ({ ctx }) => { ... });
 * ```
 */
export function errorReportingMiddleware(reporter: ErrorReportingService) {
  return async function captureErrors(opts: { ctx: any; next: Function }) {
    try {
      return await opts.next();
    } catch (error: unknown) {
      if (error instanceof Error) {
        const severity =
          error instanceof TRPCError && error.code === 'INTERNAL_SERVER_ERROR'
            ? ErrorSeverity.ERROR
            : ErrorSeverity.WARNING;

        await reporter.capture(error, {
          severity,
          context: {
            user: opts.ctx.session?.user
              ? { id: opts.ctx.session.user.id, email: opts.ctx.session.user.email }
              : undefined,
            org: opts.ctx.org
              ? { id: opts.ctx.org.orgId }
              : undefined,
            request: opts.ctx.request
              ? {
                  url: (opts.ctx.request as Request).url,
                  method: (opts.ctx.request as Request).method,
                }
              : undefined,
          },
        });
      }

      throw error;
    }
  };
}

/**
 * Wrap a fetch handler to capture uncaught exceptions.
 *
 * Any errors thrown by the underlying handler are captured to the
 * ErrorReportingService and then re-thrown so the runtime can handle
 * the response (e.g. returning a 500).
 *
 * @example
 * ```typescript
 * const handler: ExportedHandlerFetchHandler = async (request, env, ctx) => {
 *   // ...
 * };
 *
 * export default { fetch: withErrorReporting(handler, reporter) };
 * ```
 */
export function withErrorReporting(
  handler: (request: Request, ...args: unknown[]) => Promise<Response>,
  reporter: ErrorReportingService,
): (request: Request, ...args: unknown[]) => Promise<Response> {
  return async (request: Request, ...args: unknown[]): Promise<Response> => {
    try {
      return await handler(request, ...args);
    } catch (error: unknown) {
      if (error instanceof Error) {
        await reporter.capture(error, {
          severity: ErrorSeverity.FATAL,
          context: {
            request: {
              url: request.url,
              method: request.method,
              headers: Object.fromEntries(request.headers.entries()),
            },
          },
        });

        // Best-effort flush before the runtime terminates the request
        await reporter.flush();
      }

      throw error;
    }
  };
}
