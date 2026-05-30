/**
 * HTTP Client Types
 *
 * Type definitions for the HTTP client service.
 */

import type { HttpResponse } from './http-response';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';

export type HttpClientConfig = {
  baseUrl?: string;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  throwOnError?: boolean;
};

export type RequestInterceptor = (
  config: RequestInit & { url: string },
) => (RequestInit & { url: string }) | Promise<RequestInit & { url: string }>;

export type ResponseInterceptor = (
  response: HttpResponse,
) => HttpResponse | Promise<HttpResponse>;
