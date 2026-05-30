/**
 * Maintenance Mode Tests
 *
 * Verifies service enable/disable, bypass logic, middleware behavior,
 * path exclusions, and 503 response format.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MaintenanceState } from '../maintenance.types';
import {
  DEFAULT_MAINTENANCE_STATE,
  MAINTENANCE_BYPASS_COOKIE,
} from '../maintenance.types';

// ---------------------------------------------------------------------------
// Mock KV cache
// ---------------------------------------------------------------------------

type CacheStore = Record<string, unknown>;

function createMockCache(): {
  store: CacheStore;
  cache: {
    get: <T = string>(key: string) => Promise<T | null>;
    set: (key: string, value: unknown, ttl?: number) => Promise<boolean>;
    delete: (key: string) => Promise<boolean>;
  };
} {
  const store: CacheStore = {};
  return {
    store,
    cache: {
      get: vi.fn(async (key: string) => {
        return store[key] ?? null;
      }) as any,
      set: vi.fn(async (key: string, value: unknown): Promise<boolean> => {
        store[key] = value;
        return true;
      }),
      delete: vi.fn(async (key: string): Promise<boolean> => {
        delete store[key];
        return true;
      }),
    },
  };
}

function createMockCacheFactory(cache: ReturnType<typeof createMockCache>['cache']) {
  return {
    create: vi.fn(() => cache),
  };
}

// ---------------------------------------------------------------------------
// We construct MaintenanceService manually, bypassing DI decorators.
// The constructor expects a KVCacheServiceFactory.
// ---------------------------------------------------------------------------

async function createService(initialState?: Partial<MaintenanceState>) {
  const mockCache = createMockCache();
  const factory = createMockCacheFactory(mockCache.cache);

  // Dynamically import to avoid 'server-only' issues in test
  // We use a manual construction approach
  const { MaintenanceService } = await import('../maintenance.service');

  // Construct manually (bypass DI)
  const service = new (MaintenanceService as any)(factory) as InstanceType<
    typeof MaintenanceService
  >;

  if (initialState) {
    const state: MaintenanceState = { ...DEFAULT_MAINTENANCE_STATE, ...initialState };
    mockCache.store['state'] = state;
  }

  return { service, mockCache, factory };
}

// ---------------------------------------------------------------------------
// Helper to create Request objects
// ---------------------------------------------------------------------------

function createRequest(
  url: string,
  options?: { cookie?: string },
): Request {
  const headers = new Headers();
  if (options?.cookie) {
    headers.set('cookie', options.cookie);
  }
  return new Request(url, { headers });
}

// ---------------------------------------------------------------------------
// Tests: MaintenanceService
// ---------------------------------------------------------------------------

// Mock server-only to be a no-op in tests
vi.mock('server-only', () => ({}));

// Mock the DI token resolution
vi.mock('@cruzjs/core/di/tokens/token-registry', () => ({
  getToken: vi.fn(() => Symbol.for('KVCacheServiceFactory')),
  setToken: vi.fn(),
  hasToken: vi.fn(() => true),
}));

describe('MaintenanceService', () => {
  describe('enable()', () => {
    it('should set state in cache with active=true', async () => {
      const { service, mockCache } = await createService();

      await service.enable({
        message: 'Under maintenance',
        retryAfter: 1800,
        secret: 'my-secret-token',
        enabledBy: 'user-123',
      });

      const state = mockCache.store['state'] as MaintenanceState;
      expect(state.active).toBe(true);
      expect(state.message).toBe('Under maintenance');
      expect(state.retryAfter).toBe(1800);
      expect(state.secret).toBe('my-secret-token');
      expect(state.enabledBy).toBe('user-123');
      expect(state.enabledAt).toBeDefined();
    });

    it('should use default retryAfter of 3600 when not specified', async () => {
      const { service, mockCache } = await createService();

      await service.enable({ message: 'Down' });

      const state = mockCache.store['state'] as MaintenanceState;
      expect(state.retryAfter).toBe(3600);
    });

    it('should set secret to null when not provided', async () => {
      const { service, mockCache } = await createService();

      await service.enable({ message: 'Down' });

      const state = mockCache.store['state'] as MaintenanceState;
      expect(state.secret).toBeNull();
    });
  });

  describe('disable()', () => {
    it('should clear state to defaults', async () => {
      const { service, mockCache } = await createService({
        active: true,
        message: 'Down',
        secret: 'abc',
      });

      await service.disable();

      const state = mockCache.store['state'] as MaintenanceState;
      expect(state.active).toBe(false);
      expect(state.message).toBe('');
      expect(state.secret).toBeNull();
    });
  });

  describe('isActive()', () => {
    it('should return true when maintenance is active', async () => {
      const { service } = await createService({ active: true, message: 'Down' });

      expect(await service.isActive()).toBe(true);
    });

    it('should return false when maintenance is inactive', async () => {
      const { service } = await createService({ active: false });

      expect(await service.isActive()).toBe(false);
    });

    it('should return false when no state exists (first use)', async () => {
      const { service } = await createService();

      expect(await service.isActive()).toBe(false);
    });
  });

  describe('getStatus()', () => {
    it('should return active status with message and retryAfter', async () => {
      const { service } = await createService({
        active: true,
        message: 'Upgrading database',
        retryAfter: 600,
        enabledAt: '2026-01-01T00:00:00.000Z',
      });

      const status = await service.getStatus();

      expect(status.active).toBe(true);
      expect(status.message).toBe('Upgrading database');
      expect(status.retryAfter).toBe(600);
      expect(status.enabledAt).toBe('2026-01-01T00:00:00.000Z');
    });

    it('should return only active:false when inactive', async () => {
      const { service } = await createService({ active: false });

      const status = await service.getStatus();

      expect(status.active).toBe(false);
      expect(status.message).toBeUndefined();
      expect(status.retryAfter).toBeUndefined();
    });
  });

  describe('isBypassed()', () => {
    it('should return true with correct secret in query param', async () => {
      const { service } = await createService({
        active: true,
        message: 'Down',
        secret: 'bypass-token-123',
      });

      const request = createRequest('https://example.com/?bypass=bypass-token-123');
      expect(await service.isBypassed(request)).toBe(true);
    });

    it('should return true with correct secret in cookie', async () => {
      const { service } = await createService({
        active: true,
        message: 'Down',
        secret: 'bypass-token-123',
      });

      const request = createRequest('https://example.com/', {
        cookie: `${MAINTENANCE_BYPASS_COOKIE}=bypass-token-123`,
      });
      expect(await service.isBypassed(request)).toBe(true);
    });

    it('should return false with wrong secret in query param', async () => {
      const { service } = await createService({
        active: true,
        message: 'Down',
        secret: 'correct-secret',
      });

      const request = createRequest('https://example.com/?bypass=wrong-secret');
      expect(await service.isBypassed(request)).toBe(false);
    });

    it('should return false with wrong secret in cookie', async () => {
      const { service } = await createService({
        active: true,
        message: 'Down',
        secret: 'correct-secret',
      });

      const request = createRequest('https://example.com/', {
        cookie: `${MAINTENANCE_BYPASS_COOKIE}=wrong-secret`,
      });
      expect(await service.isBypassed(request)).toBe(false);
    });

    it('should return false when no secret is configured', async () => {
      const { service } = await createService({
        active: true,
        message: 'Down',
        secret: null,
      });

      const request = createRequest('https://example.com/?bypass=anything');
      expect(await service.isBypassed(request)).toBe(false);
    });

    it('should return false when no bypass param or cookie is present', async () => {
      const { service } = await createService({
        active: true,
        message: 'Down',
        secret: 'some-secret',
      });

      const request = createRequest('https://example.com/');
      expect(await service.isBypassed(request)).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: withMaintenanceCheck middleware
// ---------------------------------------------------------------------------

describe('withMaintenanceCheck', () => {
  // Import dynamically to avoid server-only issues
  async function importMiddleware() {
    return import('../maintenance.middleware');
  }

  function createMockService(overrides: {
    isActive?: boolean;
    isBypassed?: boolean;
    state?: Partial<MaintenanceState>;
  }) {
    const state: MaintenanceState = {
      ...DEFAULT_MAINTENANCE_STATE,
      active: overrides.isActive ?? false,
      message: 'System under maintenance',
      retryAfter: 3600,
      ...overrides.state,
    };

    return {
      isActive: vi.fn(async () => overrides.isActive ?? false),
      isBypassed: vi.fn(async () => overrides.isBypassed ?? false),
      getState: vi.fn(async () => state),
      getStatus: vi.fn(async () => ({
        active: state.active,
        message: state.message,
        retryAfter: state.retryAfter,
      })),
      enable: vi.fn(),
      disable: vi.fn(),
    } as any;
  }

  it('should return null when maintenance is inactive', async () => {
    const { withMaintenanceCheck } = await importMiddleware();
    const service = createMockService({ isActive: false });
    const request = createRequest('https://example.com/dashboard');

    const response = await withMaintenanceCheck(request, service);

    expect(response).toBeNull();
  });

  it('should return 503 when maintenance is active', async () => {
    const { withMaintenanceCheck } = await importMiddleware();
    const service = createMockService({
      isActive: true,
      state: { message: 'Upgrading', retryAfter: 1800 },
    });
    const request = createRequest('https://example.com/dashboard');

    const response = await withMaintenanceCheck(request, service);

    expect(response).not.toBeNull();
    expect(response!.status).toBe(503);

    const body = await response!.json() as any;
    expect(body.error).toBe('Service Unavailable');
    expect(body.message).toBe('Upgrading');
    expect(body.retryAfter).toBe(1800);
  });

  it('should include Retry-After header in 503 response', async () => {
    const { withMaintenanceCheck } = await importMiddleware();
    const service = createMockService({
      isActive: true,
      state: { retryAfter: 600 },
    });
    const request = createRequest('https://example.com/');

    const response = await withMaintenanceCheck(request, service);

    expect(response).not.toBeNull();
    expect(response!.headers.get('Retry-After')).toBe('600');
  });

  it('should exclude /api/health by default', async () => {
    const { withMaintenanceCheck } = await importMiddleware();
    const service = createMockService({ isActive: true });
    const request = createRequest('https://example.com/api/health');

    const response = await withMaintenanceCheck(request, service);

    expect(response).toBeNull();
  });

  it('should exclude maintenance tRPC routes by default', async () => {
    const { withMaintenanceCheck } = await importMiddleware();
    const service = createMockService({ isActive: true });

    const statusReq = createRequest(
      'https://example.com/api/trpc/maintenance.status',
    );
    expect(await withMaintenanceCheck(statusReq, service)).toBeNull();

    const enableReq = createRequest(
      'https://example.com/api/trpc/maintenance.enable',
    );
    expect(await withMaintenanceCheck(enableReq, service)).toBeNull();

    const disableReq = createRequest(
      'https://example.com/api/trpc/maintenance.disable',
    );
    expect(await withMaintenanceCheck(disableReq, service)).toBeNull();
  });

  it('should exclude custom paths when provided', async () => {
    const { withMaintenanceCheck } = await importMiddleware();
    const service = createMockService({ isActive: true });

    const request = createRequest('https://example.com/api/admin/dashboard');
    const response = await withMaintenanceCheck(request, service, [
      '/api/admin/*',
    ]);

    expect(response).toBeNull();
  });

  it('should return null when request is bypassed', async () => {
    const { withMaintenanceCheck } = await importMiddleware();
    const service = createMockService({
      isActive: true,
      isBypassed: true,
      state: { secret: 'my-secret' },
    });
    const request = createRequest('https://example.com/dashboard');

    const response = await withMaintenanceCheck(request, service);

    expect(response).toBeNull();
  });

  it('should return 503 when request has wrong bypass secret', async () => {
    const { withMaintenanceCheck } = await importMiddleware();
    const service = createMockService({
      isActive: true,
      isBypassed: false,
    });
    const request = createRequest('https://example.com/?bypass=wrong');

    const response = await withMaintenanceCheck(request, service);

    expect(response).not.toBeNull();
    expect(response!.status).toBe(503);
  });

  it('should set Content-Type to application/json on 503 response', async () => {
    const { withMaintenanceCheck } = await importMiddleware();
    const service = createMockService({ isActive: true });
    const request = createRequest('https://example.com/');

    const response = await withMaintenanceCheck(request, service);

    expect(response!.headers.get('Content-Type')).toBe('application/json');
  });
});

// ---------------------------------------------------------------------------
// Tests: buildBypassCookieHeader
// ---------------------------------------------------------------------------

describe('buildBypassCookieHeader', () => {
  it('should build a valid Set-Cookie header', async () => {
    const { buildBypassCookieHeader } = await import('../maintenance.middleware');
    const header = buildBypassCookieHeader('my-secret');

    expect(header).toContain(`${MAINTENANCE_BYPASS_COOKIE}=my-secret`);
    expect(header).toContain('HttpOnly');
    expect(header).toContain('Path=/');
    expect(header).toContain('SameSite=Lax');
    expect(header).toContain('Max-Age=86400');
  });
});
