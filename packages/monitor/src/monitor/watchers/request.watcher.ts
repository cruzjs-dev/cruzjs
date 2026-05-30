/**
 * Request Watcher
 *
 * Captures HTTP request/response details for the debug dashboard.
 */

import { Injectable, Inject } from '@cruzjs/core/di';
import { MonitorService } from '../monitor.service';

/** Headers to exclude from capture for security. */
const FILTERED_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-csrf-token',
]);

@Injectable()
export class RequestWatcher {
  constructor(@Inject(MonitorService) private readonly monitor: MonitorService) {}

  /**
   * Capture an HTTP request/response pair.
   */
  async capture(request: Request, response: Response, durationMs: number): Promise<void> {
    const url = new URL(request.url);

    const requestHeaders: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      if (!FILTERED_HEADERS.has(key.toLowerCase())) {
        requestHeaders[key] = value;
      }
    });

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      if (!FILTERED_HEADERS.has(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    });

    await this.monitor.record({
      type: 'request',
      content: {
        method: request.method,
        url: request.url,
        path: url.pathname,
        query: url.search,
        status: response.status,
        statusText: response.statusText,
        requestHeaders,
        responseHeaders,
        contentType: response.headers.get('content-type') ?? undefined,
      },
      familyHash: `${request.method}:${url.pathname}`,
      status: response.status >= 400 ? 'error' : 'success',
      duration: Math.round(durationMs),
      tags: ['http', request.method.toLowerCase()],
    });
  }
}
