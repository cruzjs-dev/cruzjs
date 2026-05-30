/**
 * Logging Middleware
 *
 * Generates a correlation ID for each incoming request and attaches
 * it to the logger context. Uses crypto.randomUUID() when available,
 * falling back to a simple timestamp-based ID.
 */

import type { Logger } from './logger.service';
import { LogContext } from './log-context';

/**
 * Generate a unique correlation ID for request tracing.
 */
export function generateCorrelationId(): string {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Create a request-scoped logger with a correlation ID.
 *
 * Usage in middleware / request handlers:
 * ```typescript
 * const requestLogger = createRequestLogger(logger, request);
 * requestLogger.info('Handling request', { path: url.pathname });
 * ```
 */
export function createRequestLogger(
  logger: Logger,
  request?: Request,
): Logger {
  const correlationId =
    request?.headers?.get('x-correlation-id') ??
    request?.headers?.get('x-request-id') ??
    generateCorrelationId();

  // Populate LogContext if we're inside a context scope
  LogContext.set('requestId', correlationId);
  if (request) {
    LogContext.set('method', request.method);
    LogContext.set('url', request.url);
  }

  const requestContext: Record<string, unknown> = {};
  if (request) {
    requestContext.method = request.method;
    requestContext.url = request.url;
  }

  return logger
    .withCorrelationId(correlationId)
    .withContext(requestContext);
}

/**
 * Extract a correlation ID from a request's headers,
 * or generate a new one if not present.
 */
export function getCorrelationId(request?: Request): string {
  return (
    request?.headers?.get('x-correlation-id') ??
    request?.headers?.get('x-request-id') ??
    generateCorrelationId()
  );
}
