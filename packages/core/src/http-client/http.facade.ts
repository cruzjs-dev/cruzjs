/**
 * HTTP Facade
 *
 * Static proxy for quick HTTP requests without injecting the HttpClient service.
 * Resolves the HttpClient from the DI container on each call.
 *
 * @example
 * ```typescript
 * import { Http } from '@cruzjs/core';
 *
 * const users = await Http.get('https://api.example.com/users');
 * const data = await users.json<User[]>();
 * ```
 */

import type { HttpResponse } from './http-response';
import type { HttpClientConfig } from './http-client.types';
import { HttpClient } from './http-client.service';

export class Http {
  private static _createClient(): HttpClient {
    return HttpClient.create();
  }

  /**
   * Create a configured client for reuse.
   */
  static create(config?: HttpClientConfig): HttpClient {
    return HttpClient.create(config);
  }

  static async get(url: string): Promise<HttpResponse> {
    return this._createClient().get(url).send();
  }

  static async post(url: string, body?: unknown): Promise<HttpResponse> {
    return this._createClient().post(url, body).send();
  }

  static async put(url: string, body?: unknown): Promise<HttpResponse> {
    return this._createClient().put(url, body).send();
  }

  static async patch(url: string, body?: unknown): Promise<HttpResponse> {
    return this._createClient().patch(url, body).send();
  }

  static async delete(url: string): Promise<HttpResponse> {
    return this._createClient().delete(url).send();
  }

  static async head(url: string): Promise<HttpResponse> {
    return this._createClient().head(url).send();
  }

  /**
   * Run multiple request factories concurrently.
   */
  static async pool(
    requests: Array<() => Promise<HttpResponse>>,
  ): Promise<HttpResponse[]> {
    return HttpClient.pool(requests);
  }
}
