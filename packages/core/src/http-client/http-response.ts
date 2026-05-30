/**
 * HTTP Response
 *
 * Wrapper around the native Response that provides typed accessors
 * and a fluent `.throw()` method for error handling.
 */

import { HttpError } from './http-error';

export class HttpResponse {
  constructor(
    private readonly _response: Response,
    private _body?: string,
  ) {}

  get status(): number {
    return this._response.status;
  }

  get ok(): boolean {
    return this._response.ok;
  }

  get headers(): Headers {
    return this._response.headers;
  }

  get statusText(): string {
    return this._response.statusText;
  }

  async json<T = unknown>(): Promise<T> {
    if (this._body !== undefined) {
      return JSON.parse(this._body) as T;
    }
    return this._response.json() as Promise<T>;
  }

  async text(): Promise<string> {
    if (this._body !== undefined) {
      return this._body;
    }
    const text = await this._response.text();
    this._body = text;
    return text;
  }

  async blob(): Promise<Blob> {
    return this._response.blob();
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return this._response.arrayBuffer();
  }

  /**
   * Throw an HttpError if the response status is not 2xx.
   * Returns `this` for chaining when the response is ok.
   */
  throw(): this {
    if (!this.ok) {
      throw new HttpError(this);
    }
    return this;
  }
}
