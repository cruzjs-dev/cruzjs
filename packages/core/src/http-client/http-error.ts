/**
 * HTTP Error
 *
 * Thrown when a non-2xx response is received and throw mode is enabled.
 */

import type { HttpResponse } from './http-response';

export class HttpError extends Error {
  public readonly status: number;
  public readonly response: HttpResponse;

  constructor(response: HttpResponse) {
    super(`HTTP ${response.status}`);
    this.name = 'HttpError';
    this.status = response.status;
    this.response = response;
  }
}
