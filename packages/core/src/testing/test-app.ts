type Handler = (req: Request) => Promise<Response>;

interface TestRequest {
  expect(status: number): TestRequest;
  expectJson<T = unknown>(): Promise<T>;
  expectText(): Promise<string>;
  expectHeader(name: string, value: string): TestRequest;
  execute(): Promise<Response>;
}

interface TestApp {
  get(path: string, options?: RequestInit): TestRequest;
  post(path: string, body?: unknown, options?: RequestInit): TestRequest;
  put(path: string, body?: unknown, options?: RequestInit): TestRequest;
  delete(path: string, options?: RequestInit): TestRequest;
  patch(path: string, body?: unknown, options?: RequestInit): TestRequest;
  asUser(token: string): TestApp;
}

function buildTestRequest(
  handler: Handler,
  method: string,
  path: string,
  body: unknown,
  init: RequestInit,
  baseHeaders: Record<string, string>,
): TestRequest {
  const expectedStatuses: number[] = [];
  const expectedHeaders: Array<[string, string]> = [];

  const execute = async (): Promise<Response> => {
    const headers: Record<string, string> = { ...baseHeaders };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (init.headers) {
      const initHeaders = init.headers as Record<string, string>;
      Object.assign(headers, initHeaders);
    }

    const url = path.startsWith('http') ? path : `http://localhost${path}`;
    const request = new Request(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const response = await handler(request);

    for (const status of expectedStatuses) {
      if (response.status !== status) {
        throw new Error(`Expected status ${status}, got ${response.status}`);
      }
    }
    for (const [name, value] of expectedHeaders) {
      const actual = response.headers.get(name);
      if (actual !== value) {
        throw new Error(`Expected header ${name}: ${value}, got ${actual}`);
      }
    }

    return response;
  };

  const req: TestRequest = {
    expect(status: number) {
      expectedStatuses.push(status);
      return req;
    },
    expectHeader(name: string, value: string) {
      expectedHeaders.push([name, value]);
      return req;
    },
    async expectJson<T = unknown>(): Promise<T> {
      const response = await execute();
      return response.json() as Promise<T>;
    },
    async expectText(): Promise<string> {
      const response = await execute();
      return response.text();
    },
    execute,
  };

  return req;
}

/**
 * Create a lightweight HTTP test client that wraps a fetch handler.
 *
 * @param handler - A function `(req: Request) => Promise<Response>` (e.g. your tRPC handler or a route handler)
 * @returns A fluent `TestApp` with `.get()`, `.post()`, `.put()`, `.delete()`, `.patch()` and `.asUser(token)` methods
 *
 * @example
 * const app = createTestApp(myHandler);
 * const data = await app.asUser(token).get('/api/tasks').expectJson<Task[]>();
 */
export function createTestApp(handler: Handler): TestApp {
  let authHeaders: Record<string, string> = {};

  const app: TestApp = {
    asUser(token: string): TestApp {
      authHeaders = { Authorization: `Bearer ${token}` };
      return app;
    },
    get(path: string, options: RequestInit = {}) {
      return buildTestRequest(handler, 'GET', path, undefined, options, { ...authHeaders });
    },
    post(path: string, body?: unknown, options: RequestInit = {}) {
      return buildTestRequest(handler, 'POST', path, body, options, { ...authHeaders });
    },
    put(path: string, body?: unknown, options: RequestInit = {}) {
      return buildTestRequest(handler, 'PUT', path, body, options, { ...authHeaders });
    },
    delete(path: string, options: RequestInit = {}) {
      return buildTestRequest(handler, 'DELETE', path, undefined, options, { ...authHeaders });
    },
    patch(path: string, body?: unknown, options: RequestInit = {}) {
      return buildTestRequest(handler, 'PATCH', path, body, options, { ...authHeaders });
    },
  };

  return app;
}
