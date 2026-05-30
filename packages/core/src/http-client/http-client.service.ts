/**
 * HTTP Client Service
 *
 * Injectable HTTP client with a fluent, immutable builder pattern.
 * Each builder method returns a new instance so base configs can be shared.
 *
 * @example
 * ```typescript
 * const api = httpClient.baseUrl('https://api.example.com').withBearerToken(token);
 * const users = await api.get('/users').send();
 * const posts = await api.get('/posts').send();
 * ```
 */

import { Injectable } from '../di';
import { HttpResponse } from './http-response';
import type {
  HttpMethod,
  HttpClientConfig,
  RequestInterceptor,
  ResponseInterceptor,
} from './http-client.types';

type BuilderState = {
  method?: HttpMethod;
  url?: string;
  body?: unknown;
  baseUrl: string;
  headers: Record<string, string>;
  timeout: number;
  retries: number;
  retryDelay: number;
  throwOnError: boolean;
  signal?: AbortSignal;
  requestInterceptors: RequestInterceptor[];
  responseInterceptors: ResponseInterceptor[];
};

const DEFAULT_STATE: BuilderState = {
  baseUrl: '',
  headers: {},
  timeout: 30_000,
  retries: 0,
  retryDelay: 1000,
  throwOnError: false,
  requestInterceptors: [],
  responseInterceptors: [],
};

@Injectable()
export class HttpClient {
  private readonly _state: BuilderState;

  constructor(state?: Partial<BuilderState>) {
    this._state = { ...DEFAULT_STATE, ...state };
  }

  // ── Static factories ────────────────────────────────────────────────

  /**
   * Create a new HttpClient with optional initial config.
   */
  static create(config?: HttpClientConfig): HttpClient {
    return new HttpClient({
      baseUrl: config?.baseUrl ?? '',
      headers: config?.headers ? { ...config.headers } : {},
      timeout: config?.timeout ?? 30_000,
      retries: config?.retries ?? 0,
      retryDelay: config?.retryDelay ?? 1000,
      throwOnError: config?.throwOnError ?? false,
    });
  }

  /**
   * Run multiple request factories concurrently and return all responses.
   */
  static async pool(
    requests: Array<() => Promise<HttpResponse>>,
  ): Promise<HttpResponse[]> {
    return Promise.all(requests.map((fn) => fn()));
  }

  // ── HTTP methods ────────────────────────────────────────────────────

  get(url: string): HttpClient {
    return this._clone({ method: 'GET', url });
  }

  post(url: string, body?: unknown): HttpClient {
    return this._clone({ method: 'POST', url, body });
  }

  put(url: string, body?: unknown): HttpClient {
    return this._clone({ method: 'PUT', url, body });
  }

  patch(url: string, body?: unknown): HttpClient {
    return this._clone({ method: 'PATCH', url, body });
  }

  delete(url: string): HttpClient {
    return this._clone({ method: 'DELETE', url });
  }

  head(url: string): HttpClient {
    return this._clone({ method: 'HEAD', url });
  }

  // ── Builder methods (immutable — each returns a new instance) ──────

  baseUrl(url: string): HttpClient {
    return this._clone({ baseUrl: url });
  }

  withHeaders(headers: Record<string, string>): HttpClient {
    return this._clone({
      headers: { ...this._state.headers, ...headers },
    });
  }

  withBearerToken(token: string): HttpClient {
    return this.withHeaders({ Authorization: `Bearer ${token}` });
  }

  withBasicAuth(user: string, pass: string): HttpClient {
    const encoded = btoa(`${user}:${pass}`);
    return this.withHeaders({ Authorization: `Basic ${encoded}` });
  }

  timeout(ms: number): HttpClient {
    return this._clone({ timeout: ms });
  }

  retry(times: number, delay?: number): HttpClient {
    return this._clone({
      retries: times,
      ...(delay !== undefined ? { retryDelay: delay } : {}),
    });
  }

  beforeRequest(interceptor: RequestInterceptor): HttpClient {
    return this._clone({
      requestInterceptors: [...this._state.requestInterceptors, interceptor],
    });
  }

  afterResponse(interceptor: ResponseInterceptor): HttpClient {
    return this._clone({
      responseInterceptors: [...this._state.responseInterceptors, interceptor],
    });
  }

  /**
   * Attach an external AbortSignal. Aborting it cancels the request immediately,
   * independent of the timeout signal.
   */
  signal(signal: AbortSignal): HttpClient {
    return this._clone({ signal });
  }

  /**
   * Enable auto-throw on non-2xx responses.
   */
  throw(): HttpClient {
    return this._clone({ throwOnError: true });
  }

  // ── Execute ─────────────────────────────────────────────────────────

  /**
   * Send the request and return an HttpResponse.
   */
  async send(): Promise<HttpResponse> {
    const { method, url, body, baseUrl, headers, timeout, retries, retryDelay, throwOnError } =
      this._state;

    if (!method || !url) {
      throw new Error('HttpClient: method and url are required. Call .get(url), .post(url), etc. before .send().');
    }

    const fullUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}` : url;

    let requestConfig: RequestInit & { url: string } = {
      url: fullUrl,
      method,
      headers: { ...headers },
    };

    if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
      if (typeof body === 'string') {
        requestConfig.body = body;
      } else {
        requestConfig.body = JSON.stringify(body);
        (requestConfig.headers as Record<string, string>)['Content-Type'] ??=
          'application/json';
      }
    }

    // Apply request interceptors
    for (const interceptor of this._state.requestInterceptors) {
      requestConfig = await interceptor(requestConfig);
    }

    // Execute with retries
    const externalSignal = this._state.signal;

    let lastError: unknown;
    const maxAttempts = retries + 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Bail early if caller already aborted before this attempt
      if (externalSignal?.aborted) {
        throw externalSignal.reason ?? new DOMException('The operation was aborted.', 'AbortError');
      }

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);

        const { url: reqUrl, ...fetchInit } = requestConfig;

        const signal = externalSignal
          ? AbortSignal.any([controller.signal, externalSignal])
          : controller.signal;

        const raw = await fetch(reqUrl, {
          ...fetchInit,
          signal,
        });

        clearTimeout(timer);

        let response = new HttpResponse(raw);

        // Apply response interceptors
        for (const interceptor of this._state.responseInterceptors) {
          response = await interceptor(response);
        }

        if (throwOnError) {
          response.throw();
        }

        return response;
      } catch (error) {
        lastError = error;

        // Don't retry on abort (timeout) or if this was the last attempt
        const isLastAttempt = attempt === maxAttempts - 1;
        if (isLastAttempt) {
          break;
        }

        // Exponential backoff: delay * 2^attempt
        const backoff = retryDelay * Math.pow(2, attempt);
        await this._sleep(backoff);
      }
    }

    throw lastError;
  }

  // ── Internals ───────────────────────────────────────────────────────

  private _clone(overrides: Partial<BuilderState>): HttpClient {
    return new HttpClient({
      ...this._state,
      headers: { ...this._state.headers },
      requestInterceptors: [...this._state.requestInterceptors],
      responseInterceptors: [...this._state.responseInterceptors],
      ...overrides,
    });
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
