import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpClient } from '../http-client.service';
import { HttpResponse } from '../http-response';
import { HttpError } from '../http-error';
import { Http } from '../http.facade';

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockFetch(body: unknown, init?: ResponseInit): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify(body), init)),
  );
}

function mockFetchText(text: string, init?: ResponseInit): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(text, init)),
  );
}

function mockFetchFailThenSucceed(
  failCount: number,
  body: unknown,
): ReturnType<typeof vi.fn> {
  let calls = 0;
  const fn = vi.fn().mockImplementation(() => {
    calls++;
    if (calls <= failCount) {
      return Promise.reject(new Error('Network error'));
    }
    return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('HttpClient', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ── HTTP Methods ─────────────────────────────────────────────────────

  describe('HTTP methods', () => {
    it('sends a GET request', async () => {
      mockFetch({ ok: true });
      const client = HttpClient.create();
      const response = await client.get('https://api.test/items').send();

      expect(fetch).toHaveBeenCalledWith(
        'https://api.test/items',
        expect.objectContaining({ method: 'GET' }),
      );
      expect(response.ok).toBe(true);
      expect(await response.json()).toEqual({ ok: true });
    });

    it('sends a POST request with JSON body', async () => {
      mockFetch({ id: 1 }, { status: 201 });
      const client = HttpClient.create();
      const response = await client.post('https://api.test/items', { name: 'test' }).send();

      expect(fetch).toHaveBeenCalledWith(
        'https://api.test/items',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'test' }),
        }),
      );
      expect(response.status).toBe(201);
    });

    it('sends a PUT request with body', async () => {
      mockFetch({ updated: true });
      const client = HttpClient.create();
      await client.put('https://api.test/items/1', { name: 'updated' }).send();

      expect(fetch).toHaveBeenCalledWith(
        'https://api.test/items/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ name: 'updated' }),
        }),
      );
    });

    it('sends a PATCH request with body', async () => {
      mockFetch({ patched: true });
      const client = HttpClient.create();
      await client.patch('https://api.test/items/1', { name: 'patched' }).send();

      expect(fetch).toHaveBeenCalledWith(
        'https://api.test/items/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ name: 'patched' }),
        }),
      );
    });

    it('sends a DELETE request', async () => {
      mockFetchText('', { status: 200 });
      const client = HttpClient.create();
      await client.delete('https://api.test/items/1').send();

      expect(fetch).toHaveBeenCalledWith(
        'https://api.test/items/1',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('sends a HEAD request', async () => {
      mockFetchText('', { status: 200 });
      const client = HttpClient.create();
      const response = await client.head('https://api.test/items').send();

      expect(fetch).toHaveBeenCalledWith(
        'https://api.test/items',
        expect.objectContaining({ method: 'HEAD' }),
      );
      expect(response.ok).toBe(true);
    });

    it('sends a string body without adding Content-Type', async () => {
      mockFetchText('ok');
      const client = HttpClient.create();
      await client.post('https://api.test/raw', 'raw body').send();

      const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[1].body).toBe('raw body');
      expect(callArgs[1].headers['Content-Type']).toBeUndefined();
    });
  });

  // ── Base URL ─────────────────────────────────────────────────────────

  describe('baseUrl', () => {
    it('prepends base URL to request path', async () => {
      mockFetch({ ok: true });
      const client = HttpClient.create({ baseUrl: 'https://api.test' });
      await client.get('/items').send();

      expect(fetch).toHaveBeenCalledWith(
        'https://api.test/items',
        expect.any(Object),
      );
    });

    it('handles trailing slash on base and leading slash on path', async () => {
      mockFetch({ ok: true });
      const client = HttpClient.create({ baseUrl: 'https://api.test/' });
      await client.get('/items').send();

      expect(fetch).toHaveBeenCalledWith(
        'https://api.test/items',
        expect.any(Object),
      );
    });
  });

  // ── Headers & Auth ───────────────────────────────────────────────────

  describe('headers and auth', () => {
    it('sets custom headers', async () => {
      mockFetch({ ok: true });
      const client = HttpClient.create();
      await client
        .withHeaders({ 'X-Custom': 'value' })
        .get('https://api.test/items')
        .send();

      const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[1].headers['X-Custom']).toBe('value');
    });

    it('sets Bearer token header', async () => {
      mockFetch({ ok: true });
      const client = HttpClient.create();
      await client
        .withBearerToken('my-token')
        .get('https://api.test/items')
        .send();

      const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[1].headers['Authorization']).toBe('Bearer my-token');
    });

    it('sets Basic auth header', async () => {
      mockFetch({ ok: true });
      const client = HttpClient.create();
      await client
        .withBasicAuth('user', 'pass')
        .get('https://api.test/items')
        .send();

      const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[1].headers['Authorization']).toBe(`Basic ${btoa('user:pass')}`);
    });

    it('auto-sets Content-Type for JSON bodies', async () => {
      mockFetch({ ok: true });
      const client = HttpClient.create();
      await client.post('https://api.test/items', { key: 'value' }).send();

      const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[1].headers['Content-Type']).toBe('application/json');
    });
  });

  // ── Immutability ─────────────────────────────────────────────────────

  describe('immutability', () => {
    it('returns a new instance from builder methods', () => {
      const base = HttpClient.create({ baseUrl: 'https://api.test' });
      const withToken = base.withBearerToken('tok');
      const withGet = withToken.get('/items');

      expect(base).not.toBe(withToken);
      expect(withToken).not.toBe(withGet);
    });

    it('shared base config does not bleed between requests', async () => {
      mockFetch({ ok: true });
      const api = HttpClient.create({ baseUrl: 'https://api.test' })
        .withBearerToken('shared');

      await api.get('/users').send();
      await api.get('/posts').send();

      const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls[0][0]).toBe('https://api.test/users');
      expect(calls[1][0]).toBe('https://api.test/posts');
      expect(calls[0][1].headers['Authorization']).toBe('Bearer shared');
      expect(calls[1][1].headers['Authorization']).toBe('Bearer shared');
    });
  });

  // ── Retry ────────────────────────────────────────────────────────────

  describe('retry', () => {
    it('retries on failure with exponential backoff', async () => {
      const fetchFn = mockFetchFailThenSucceed(2, { ok: true });
      const client = HttpClient.create();
      const response = await client
        .retry(3, 100)
        .get('https://api.test/items')
        .send();

      expect(fetchFn).toHaveBeenCalledTimes(3);
      expect(response.ok).toBe(true);
    });

    it('throws after exhausting retries', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('Network error')),
      );

      const client = HttpClient.create();
      await expect(
        client.retry(2, 10).get('https://api.test/items').send(),
      ).rejects.toThrow('Network error');

      expect(fetch).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    });

    it('does not retry when retries is 0', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('Network error')),
      );

      const client = HttpClient.create();
      await expect(
        client.get('https://api.test/items').send(),
      ).rejects.toThrow('Network error');

      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  // ── Timeout ──────────────────────────────────────────────────────────

  describe('timeout', () => {
    it('aborts request when timeout expires', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((_url: string, init: RequestInit) => {
          return new Promise((_resolve, reject) => {
            if (init.signal) {
              init.signal.addEventListener('abort', () => {
                reject(new DOMException('The operation was aborted.', 'AbortError'));
              });
            }
          });
        }),
      );

      const client = HttpClient.create();
      const promise = client.timeout(100).get('https://api.test/slow').send();

      await expect(promise).rejects.toThrow('aborted');
    });
  });

  // ── Abort signal ─────────────────────────────────────────────────────

  describe('abort signal', () => {
    it('aborts an in-flight request when the external signal fires', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((_url: string, init: RequestInit) => {
          return new Promise((_resolve, reject) => {
            if (init.signal) {
              init.signal.addEventListener('abort', () => {
                reject(new DOMException('The operation was aborted.', 'AbortError'));
              });
            }
          });
        }),
      );

      const controller = new AbortController();
      const client = HttpClient.create();
      const promise = client.signal(controller.signal).get('https://api.test/slow').send();

      controller.abort();

      await expect(promise).rejects.toThrow('aborted');
    });

    it('throws immediately if signal is already aborted before send()', async () => {
      mockFetch({ ok: true });
      const controller = new AbortController();
      controller.abort();

      const client = HttpClient.create();
      await expect(
        client.signal(controller.signal).get('https://api.test/items').send(),
      ).rejects.toMatchObject({ name: 'AbortError' });

      expect(fetch).not.toHaveBeenCalled();
    });

    it('signal does not bleed between cloned instances', () => {
      const controller = new AbortController();
      const base = HttpClient.create();
      const withSignal = base.signal(controller.signal);

      // @ts-expect-error accessing private state for test
      expect(base._state.signal).toBeUndefined();
      // @ts-expect-error accessing private state for test
      expect(withSignal._state.signal).toBe(controller.signal);
    });
  });

  // ── Interceptors ─────────────────────────────────────────────────────

  describe('interceptors', () => {
    it('applies request interceptors', async () => {
      mockFetch({ ok: true });
      const client = HttpClient.create();
      await client
        .beforeRequest((config) => ({
          ...config,
          headers: { ...config.headers as Record<string, string>, 'X-Intercepted': 'true' },
        }))
        .get('https://api.test/items')
        .send();

      const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[1].headers['X-Intercepted']).toBe('true');
    });

    it('applies response interceptors', async () => {
      mockFetch({ original: true });
      const client = HttpClient.create();
      let interceptedStatus = 0;

      const response = await client
        .afterResponse((res) => {
          interceptedStatus = res.status;
          return res;
        })
        .get('https://api.test/items')
        .send();

      expect(interceptedStatus).toBe(200);
      expect(response.ok).toBe(true);
    });

    it('chains multiple request interceptors in order', async () => {
      mockFetch({ ok: true });
      const order: number[] = [];

      const client = HttpClient.create()
        .beforeRequest((config) => {
          order.push(1);
          return config;
        })
        .beforeRequest((config) => {
          order.push(2);
          return config;
        });

      await client.get('https://api.test/items').send();
      expect(order).toEqual([1, 2]);
    });
  });

  // ── throw() ──────────────────────────────────────────────────────────

  describe('throw()', () => {
    it('throws HttpError on non-2xx when throw mode is enabled', async () => {
      mockFetch({ error: 'not found' }, { status: 404, statusText: 'Not Found' });
      const client = HttpClient.create();

      await expect(
        client.throw().get('https://api.test/missing').send(),
      ).rejects.toThrow(HttpError);
    });

    it('does not throw on 2xx when throw mode is enabled', async () => {
      mockFetch({ ok: true });
      const client = HttpClient.create();
      const response = await client.throw().get('https://api.test/items').send();

      expect(response.ok).toBe(true);
    });

    it('HttpResponse.throw() returns this on success', () => {
      const raw = new Response('ok', { status: 200 });
      const response = new HttpResponse(raw);
      expect(response.throw()).toBe(response);
    });

    it('HttpResponse.throw() throws HttpError on failure', () => {
      const raw = new Response('fail', { status: 500 });
      const response = new HttpResponse(raw);
      expect(() => response.throw()).toThrow(HttpError);
    });
  });

  // ── Pool ─────────────────────────────────────────────────────────────

  describe('pool', () => {
    it('runs requests concurrently and returns all responses', async () => {
      let callCount = 0;
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(() => {
          callCount++;
          return Promise.resolve(
            new Response(JSON.stringify({ n: callCount }), { status: 200 }),
          );
        }),
      );

      const client = HttpClient.create({ baseUrl: 'https://api.test' });
      const responses = await HttpClient.pool([
        () => client.get('/a').send(),
        () => client.get('/b').send(),
        () => client.get('/c').send(),
      ]);

      expect(responses).toHaveLength(3);
      expect(responses.every((r) => r.ok)).toBe(true);
    });
  });

  // ── HttpResponse ─────────────────────────────────────────────────────

  describe('HttpResponse', () => {
    it('returns status and statusText', () => {
      const raw = new Response('', { status: 201, statusText: 'Created' });
      const response = new HttpResponse(raw);
      expect(response.status).toBe(201);
      expect(response.statusText).toBe('Created');
    });

    it('parses JSON body', async () => {
      const raw = new Response(JSON.stringify({ key: 'value' }));
      const response = new HttpResponse(raw);
      expect(await response.json()).toEqual({ key: 'value' });
    });

    it('returns text body', async () => {
      const raw = new Response('hello world');
      const response = new HttpResponse(raw);
      expect(await response.text()).toBe('hello world');
    });

    it('caches text and uses it for subsequent json calls', async () => {
      const raw = new Response(JSON.stringify({ cached: true }));
      const response = new HttpResponse(raw);

      // Read text first (consumes body)
      const text = await response.text();
      expect(text).toBe('{"cached":true}');

      // JSON should still work from cached text
      const json = await response.json();
      expect(json).toEqual({ cached: true });
    });

    it('exposes headers', () => {
      const raw = new Response('', {
        headers: { 'X-Custom': 'test' },
      });
      const response = new HttpResponse(raw);
      expect(response.headers.get('X-Custom')).toBe('test');
    });
  });

  // ── HttpError ────────────────────────────────────────────────────────

  describe('HttpError', () => {
    it('captures status and response', () => {
      const raw = new Response('error', { status: 403 });
      const response = new HttpResponse(raw);
      const error = new HttpError(response);

      expect(error.status).toBe(403);
      expect(error.response).toBe(response);
      expect(error.message).toBe('HTTP 403');
      expect(error.name).toBe('HttpError');
    });
  });

  // ── Http Facade ──────────────────────────────────────────────────────

  describe('Http facade', () => {
    it('Http.get sends a GET request', async () => {
      mockFetch({ ok: true });
      const response = await Http.get('https://api.test/items');
      expect(response.ok).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.test/items',
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('Http.post sends a POST request with body', async () => {
      mockFetch({ id: 1 });
      const response = await Http.post('https://api.test/items', { name: 'test' });
      expect(response.ok).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.test/items',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'test' }),
        }),
      );
    });

    it('Http.pool runs requests concurrently', async () => {
      mockFetch({ ok: true });
      const responses = await Http.pool([
        () => Http.get('https://api.test/a'),
        () => Http.get('https://api.test/b'),
      ]);
      expect(responses).toHaveLength(2);
    });
  });

  // ── Edge cases ───────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('throws when send() called without method', async () => {
      const client = HttpClient.create();
      await expect(client.send()).rejects.toThrow('method and url are required');
    });

    it('does not include body for GET requests even if body was set', async () => {
      mockFetch({ ok: true });
      // Using the internal clone mechanism - GET should not attach body
      const client = HttpClient.create();
      await client.get('https://api.test/items').send();

      const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[1].body).toBeUndefined();
    });
  });
});
