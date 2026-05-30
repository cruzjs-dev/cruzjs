/**
 * Session Management Unit Tests
 *
 * Tests for SessionService, device fingerprinting, and device label parsing.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SessionAdapter } from '../session.adapter';
import type { SessionData, CreateSessionInput } from '../session.types';
import { DEFAULT_SESSION_CONFIG } from '../session.types';
import { SessionService } from '../session.service';
import { generateDeviceFingerprint, parseDeviceLabel } from '../session.fingerprint';

// ── Mock adapter ──────────────────────────────────────────────────────────

function createMockAdapter(): SessionAdapter & {
  _store: Map<string, SessionData>;
} {
  const store = new Map<string, SessionData>();

  return {
    _store: store,

    store: vi.fn(async (session: SessionData) => {
      store.set(session.tokenHash, session);
      store.set(`id:${session.id}`, session);
    }),

    retrieve: vi.fn(async (tokenHash: string) => {
      return store.get(tokenHash) ?? null;
    }),

    retrieveById: vi.fn(async (id: string) => {
      return store.get(`id:${id}`) ?? null;
    }),

    listByUser: vi.fn(async (userId: string) => {
      const sessions: SessionData[] = [];
      for (const [key, session] of store) {
        if (session.userId === userId && !key.startsWith('id:')) {
          sessions.push(session);
        }
      }
      return sessions;
    }),

    touch: vi.fn(async (id: string, lastActiveAt: Date) => {
      const session = store.get(`id:${id}`);
      if (session) {
        const updated = { ...session, lastActiveAt };
        store.set(session.tokenHash, updated);
        store.set(`id:${id}`, updated);
      }
    }),

    revoke: vi.fn(async (id: string) => {
      const session = store.get(`id:${id}`);
      if (session) {
        const revoked = { ...session, revokedAt: new Date() };
        store.set(session.tokenHash, revoked);
        store.set(`id:${id}`, revoked);
      }
    }),

    revokeAll: vi.fn(async (userId: string) => {
      for (const [key, session] of store) {
        if (session.userId === userId && !key.startsWith('id:')) {
          const revoked = { ...session, revokedAt: new Date() };
          store.set(session.tokenHash, revoked);
          store.set(`id:${session.id}`, revoked);
        }
      }
    }),

    prune: vi.fn(async () => {
      const now = new Date();
      let count = 0;
      for (const [key, session] of store) {
        if (session.expiresAt < now || session.revokedAt !== null) {
          store.delete(key);
          count++;
        }
      }
      return Math.floor(count / 2);
    }),
  };
}

// ── Mock ConfigService ──────────────────────────────────────────────────

function createMockConfig(overrides: Record<string, unknown> = {}) {
  return {
    get: vi.fn((key: string, fallback: unknown) => overrides[key] ?? fallback),
    getOrThrow: vi.fn((key: string) => {
      if (key in overrides) return overrides[key];
      throw new Error(`Config key ${key} not found`);
    }),
  };
}

// ── Helper to create a SessionService with injected mock ────────────────

function createService(
  adapter?: SessionAdapter,
  configOverrides?: Record<string, unknown>,
) {
  const mockConfig = createMockConfig(configOverrides ?? {});
  const mockDb = {} as any;

  // We construct SessionService manually since we're testing the service logic,
  // not the DI wiring. The service accepts an optional adapter and falls back
  // to DatabaseSessionAdapter, but we always provide our mock.
  const service = new SessionService(
    adapter,
    mockDb,
    mockConfig as any,
  );

  return service;
}

// ── SessionService Tests ──────────────────────────────────────────────

describe('SessionService', () => {
  let adapter: ReturnType<typeof createMockAdapter>;
  let service: SessionService;

  beforeEach(() => {
    adapter = createMockAdapter();
    service = createService(adapter);
  });

  describe('create()', () => {
    it('generates a token and stores a hashed version', async () => {
      const input: CreateSessionInput = {
        userId: 'user-1',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0',
      };

      const { session, token } = await service.create(input);

      expect(token).toBeTruthy();
      expect(token.length).toBe(64); // 32 bytes hex-encoded
      expect(session.tokenHash).toBeTruthy();
      expect(session.tokenHash).not.toBe(token); // Hash is different from raw token
      expect(session.userId).toBe('user-1');
      expect(session.ipAddress).toBe('192.168.1.1');
      expect(session.deviceLabel).toBe('Chrome on macOS');
      expect(adapter.store).toHaveBeenCalledTimes(1);
    });

    it('uses default expiry when not specified', async () => {
      const { session } = await service.create({ userId: 'user-1' });
      const expectedExpiry = session.createdAt.getTime() + DEFAULT_SESSION_CONFIG.sessionTtlSeconds * 1000;
      // Allow 1 second of drift
      expect(Math.abs(session.expiresAt.getTime() - expectedExpiry)).toBeLessThan(1000);
    });

    it('uses custom expiry when specified', async () => {
      const { session } = await service.create({
        userId: 'user-1',
        expiresIn: 3600, // 1 hour
      });
      const expectedExpiry = session.createdAt.getTime() + 3600 * 1000;
      expect(Math.abs(session.expiresAt.getTime() - expectedExpiry)).toBeLessThan(1000);
    });

    it('stores metadata', async () => {
      const { session } = await service.create({
        userId: 'user-1',
        metadata: { source: 'mobile-app', version: '2.0' },
      });
      expect(session.metadata).toEqual({ source: 'mobile-app', version: '2.0' });
    });
  });

  describe('validate()', () => {
    it('validates a correct token', async () => {
      const { token } = await service.create({ userId: 'user-1' });
      const result = await service.validate(token);
      expect(result).not.toBeNull();
      expect(result!.userId).toBe('user-1');
    });

    it('rejects an invalid token', async () => {
      await service.create({ userId: 'user-1' });
      const result = await service.validate('invalid-token-hex-string');
      expect(result).toBeNull();
    });

    it('rejects an expired session', async () => {
      const { token, session } = await service.create({
        userId: 'user-1',
        expiresIn: -1, // Already expired
      });

      // Manually set expired session in the store
      const expired = { ...session, expiresAt: new Date(Date.now() - 1000) };
      adapter._store.set(session.tokenHash, expired);
      adapter._store.set(`id:${session.id}`, expired);

      const result = await service.validate(token);
      expect(result).toBeNull();
    });

    it('rejects a revoked session', async () => {
      const { token } = await service.create({ userId: 'user-1' });
      const sessions = await service.listActive('user-1');
      await service.revoke(sessions[0].id);

      const result = await service.validate(token);
      expect(result).toBeNull();
    });
  });

  describe('revoke()', () => {
    it('marks a session as revoked', async () => {
      const { session } = await service.create({ userId: 'user-1' });
      await service.revoke(session.id);

      expect(adapter.revoke).toHaveBeenCalledWith(session.id);
      const stored = adapter._store.get(`id:${session.id}`);
      expect(stored?.revokedAt).not.toBeNull();
    });
  });

  describe('revokeAll()', () => {
    it('revokes all sessions for a user', async () => {
      await service.create({ userId: 'user-1' });
      await service.create({ userId: 'user-1' });
      await service.create({ userId: 'user-2' });

      await service.revokeAll('user-1');

      expect(adapter.revokeAll).toHaveBeenCalledWith('user-1');

      // user-1 sessions should be revoked
      const user1Sessions = await service.listActive('user-1');
      expect(user1Sessions).toHaveLength(0);

      // user-2 sessions should be unaffected
      const user2Sessions = await service.listActive('user-2');
      expect(user2Sessions).toHaveLength(1);
    });
  });

  describe('listActive()', () => {
    it('excludes expired sessions', async () => {
      const { session } = await service.create({ userId: 'user-1' });

      // Manually expire the session
      const expired = { ...session, expiresAt: new Date(Date.now() - 1000) };
      adapter._store.set(session.tokenHash, expired);
      adapter._store.set(`id:${session.id}`, expired);

      const active = await service.listActive('user-1');
      expect(active).toHaveLength(0);
    });

    it('excludes revoked sessions', async () => {
      const { session } = await service.create({ userId: 'user-1' });
      await service.revoke(session.id);

      const active = await service.listActive('user-1');
      expect(active).toHaveLength(0);
    });

    it('returns only active sessions', async () => {
      await service.create({ userId: 'user-1' });
      await service.create({ userId: 'user-1' });

      const active = await service.listActive('user-1');
      expect(active).toHaveLength(2);
    });
  });

  describe('touch()', () => {
    it('updates lastActiveAt when interval has elapsed', async () => {
      const { session } = await service.create({ userId: 'user-1' });

      // Simulate time passing: set lastActiveAt to 2 minutes ago
      const twoMinutesAgo = new Date(Date.now() - 120_000);
      const oldSession = { ...session, lastActiveAt: twoMinutesAgo };
      adapter._store.set(session.tokenHash, oldSession);
      adapter._store.set(`id:${session.id}`, oldSession);

      await service.touch(session.id);

      expect(adapter.touch).toHaveBeenCalled();
    });

    it('skips update when touch interval has not elapsed', async () => {
      const { session } = await service.create({ userId: 'user-1' });

      // lastActiveAt is current (just created), so touch should skip
      await service.touch(session.id);

      expect(adapter.touch).not.toHaveBeenCalled();
    });
  });

  describe('prune()', () => {
    it('removes expired and revoked sessions', async () => {
      const { session: s1 } = await service.create({ userId: 'user-1' });
      await service.create({ userId: 'user-1' });

      // Expire s1
      const expired = { ...s1, expiresAt: new Date(Date.now() - 1000) };
      adapter._store.set(s1.tokenHash, expired);
      adapter._store.set(`id:${s1.id}`, expired);

      const count = await service.prune();
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('enforceSessionLimit()', () => {
    it('revokes oldest sessions when over limit', async () => {
      // Create a service with max 2 sessions
      const limitedService = createService(adapter, {
        SESSION_MAX_PER_USER: 2,
      });

      await limitedService.create({ userId: 'user-1' });
      await limitedService.create({ userId: 'user-1' });

      // This third session should trigger eviction of the oldest
      await limitedService.create({ userId: 'user-1' });

      const active = await limitedService.listActive('user-1');
      expect(active.length).toBeLessThanOrEqual(2);
    });
  });

  describe('hashToken()', () => {
    it('produces consistent hashes for the same input', async () => {
      const hash1 = await service.hashToken('test-token-123');
      const hash2 = await service.hashToken('test-token-123');
      expect(hash1).toBe(hash2);
    });

    it('produces different hashes for different inputs', async () => {
      const hash1 = await service.hashToken('token-a');
      const hash2 = await service.hashToken('token-b');
      expect(hash1).not.toBe(hash2);
    });
  });
});

// ── Fingerprint Tests ──────────────────────────────────────────────────

describe('generateDeviceFingerprint()', () => {
  it('generates a consistent fingerprint for the same headers', async () => {
    const headers = new Headers({
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0',
      'accept-language': 'en-US,en;q=0.9',
    });

    const fp1 = await generateDeviceFingerprint(headers);
    const fp2 = await generateDeviceFingerprint(headers);

    expect(fp1).toBe(fp2);
    expect(fp1.length).toBe(64); // SHA-256 hex
  });

  it('generates different fingerprints for different headers', async () => {
    const headers1 = new Headers({
      'user-agent': 'Chrome/120.0.0.0',
    });
    const headers2 = new Headers({
      'user-agent': 'Firefox/121.0',
    });

    const fp1 = await generateDeviceFingerprint(headers1);
    const fp2 = await generateDeviceFingerprint(headers2);

    expect(fp1).not.toBe(fp2);
  });
});

// ── parseDeviceLabel Tests ──────────────────────────────────────────────

describe('parseDeviceLabel()', () => {
  it('parses Chrome on macOS', () => {
    const label = parseDeviceLabel(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );
    expect(label).toBe('Chrome on macOS');
  });

  it('parses Firefox on Windows', () => {
    const label = parseDeviceLabel(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    );
    expect(label).toBe('Firefox on Windows');
  });

  it('parses Safari on iOS', () => {
    const label = parseDeviceLabel(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    );
    expect(label).toBe('Mobile Safari on iOS');
  });

  it('parses Edge on Windows', () => {
    const label = parseDeviceLabel(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    );
    expect(label).toBe('Edge on Windows');
  });

  it('parses Chrome Mobile on Android', () => {
    const label = parseDeviceLabel(
      'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36',
    );
    expect(label).toBe('Chrome Mobile on Android');
  });

  it('parses Safari on macOS', () => {
    const label = parseDeviceLabel(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    );
    expect(label).toBe('Safari on macOS');
  });

  it('parses cURL', () => {
    const label = parseDeviceLabel('curl/8.4.0');
    expect(label).toBe('cURL on Unknown OS');
  });

  it('parses Firefox on Linux', () => {
    const label = parseDeviceLabel(
      'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
    );
    expect(label).toBe('Firefox on Linux');
  });
});
