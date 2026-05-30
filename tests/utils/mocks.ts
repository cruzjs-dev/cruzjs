import { vi } from 'vitest';

/**
 * Mock utilities for testing
 */

/**
 * Mock AWS S3 client
 */
export function mockS3Client() {
  return {
    send: vi.fn(),
  };
}

/**
 * Mock AWS SES client
 */
export function mockSESClient() {
  return {
    send: vi.fn().mockResolvedValue({
      MessageId: 'test-message-id',
    }),
  };
}

/**
 * Mock Redis client
 */
export function mockRedisClient() {
  return {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
    ping: vi.fn().mockResolvedValue('PONG'),
    quit: vi.fn(),
  };
}

/**
 * Mock Stripe client
 */
export function mockStripeClient() {
  return {
    customers: {
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
    },
    subscriptions: {
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      cancel: vi.fn(),
    },
    checkout: {
      sessions: {
        create: vi.fn(),
        retrieve: vi.fn(),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn(),
      },
    },
  };
}

/**
 * Mock Request object
 */
export function createMockRequest(
  method: string = 'GET',
  url: string = 'http://localhost:3000/api/test',
  headers: Record<string, string> = {},
  body?: any
): Request {
  const requestHeaders = new Headers(headers);
  
  return {
    method,
    url,
    headers: requestHeaders,
    json: async () => body || {},
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body || {})),
    formData: async () => new FormData(),
    clone: () => createMockRequest(method, url, headers, body),
  } as Request;
}

/**
 * Mock authenticated request
 */
export function createMockAuthenticatedRequest(
  userId: string,
  options: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: any;
  } = {}
): Request {
  const headers = {
    cookie: `session=test-session-token`,
    authorization: `Bearer test-token`,
    ...options.headers,
  };

  return createMockRequest(
    options.method || 'GET',
    options.url || 'http://localhost:3000/api/test',
    headers,
    options.body
  );
}

