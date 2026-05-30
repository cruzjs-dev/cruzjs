/**
 * Magic Link Tests
 *
 * Verifies token generation/hashing, request flow, rate limiting,
 * verify/consume, expiry, already-used, peek, cleanup, and email template.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildMagicLinkEmail } from '../magic-link.email';
import { DEFAULT_MAGIC_LINK_CONFIG } from '../magic-link.types';

// ---------------------------------------------------------------------------
// Mock server-only to be a no-op in tests
// ---------------------------------------------------------------------------
vi.mock('server-only', () => ({}));

// Mock DI token resolution
vi.mock('@cruzjs/core/di/tokens/token-registry', () => ({
  getToken: vi.fn((target: unknown) => {
    if (typeof target === 'function') return Symbol.for(target.name);
    return Symbol.for('unknown');
  }),
  setToken: vi.fn(),
  hasToken: vi.fn(() => true),
}));

// ---------------------------------------------------------------------------
// Drizzle table name helper
// ---------------------------------------------------------------------------

const DRIZZLE_NAME = Symbol.for('drizzle:Name');

function getTableName(table: unknown): string {
  if (table && typeof table === 'object' && DRIZZLE_NAME in table) {
    return (table as Record<symbol, string>)[DRIZZLE_NAME];
  }
  return 'unknown';
}

// ---------------------------------------------------------------------------
// Mock database
// ---------------------------------------------------------------------------

type DbRow = Record<string, unknown>;

function createMockDb() {
  const tables: Record<string, DbRow[]> = {};

  function getRows(table: unknown): DbRow[] {
    const name = getTableName(table);
    if (!tables[name]) tables[name] = [];
    return tables[name];
  }

  const db = {
    _tables: tables,
    _seed(tableName: string, rows: DbRow[]) {
      tables[tableName] = [...rows];
    },

    select: vi.fn((_fields?: Record<string, unknown>) => {
      const selectFields = _fields;
      return {
        from: vi.fn((table: unknown) => {
          const rows = getRows(table);

          function makeWhereResult(): Promise<DbRow[]> & { limit: (n: number) => Promise<DbRow[]> } {
            const defaultResult = selectFields && 'count' in selectFields
              ? Promise.resolve([{ count: rows.length }])
              : Promise.resolve([...rows]);

            const result = defaultResult as Promise<DbRow[]> & { limit: (n: number) => Promise<DbRow[]> };
            result.limit = vi.fn((_n: number) => {
              if (selectFields && 'count' in selectFields) {
                return Promise.resolve([{ count: rows.length }]);
              }
              return Promise.resolve(rows.slice(0, _n));
            });
            return result;
          }

          return {
            where: vi.fn((_condition: unknown) => makeWhereResult()),
            limit: vi.fn((_n: number) => {
              return Promise.resolve(rows.slice(0, _n));
            }),
          };
        }),
      };
    }),

    insert: vi.fn((table: unknown) => {
      const rows = getRows(table);
      return {
        values: vi.fn((values: DbRow) => {
          const id = `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const row = { id, ...values };
          rows.push(row);
          return {
            returning: vi.fn(() => Promise.resolve([row])),
          };
        }),
      };
    }),

    update: vi.fn((table: unknown) => {
      const rows = getRows(table);
      return {
        set: vi.fn((values: DbRow) => {
          return {
            where: vi.fn((_condition: unknown) => {
              if (rows.length > 0) {
                Object.assign(rows[0], values);
              }
              return {
                returning: vi.fn(() => Promise.resolve(rows.length > 0 ? [rows[0]] : [])),
              };
            }),
          };
        }),
      };
    }),

    delete: vi.fn((table: unknown) => {
      const rows = getRows(table);
      return {
        where: vi.fn((_condition: unknown) => {
          const deleted = [...rows];
          rows.length = 0;
          return {
            returning: vi.fn(() => Promise.resolve(deleted)),
          };
        }),
      };
    }),
  };

  return db;
}

function createMockEmailService() {
  return {
    sendEmail: vi.fn(async () => 'msg-id-123'),
    sendBulkEmail: vi.fn(),
    sendTemplatedEmail: vi.fn(),
  };
}

function createMockConfigService(overrides: Record<string, unknown> = {}) {
  const config: Record<string, unknown> = {
    APP_URL: 'https://example.com',
    APP_NAME: 'TestApp',
    EMAIL_FROM: 'noreply@example.com',
    ...overrides,
  };

  return {
    get: vi.fn(<T = unknown>(key: string, defaultValue?: T) => {
      return config[key] !== undefined ? config[key] : defaultValue;
    }),
    getOrThrow: vi.fn(<T = unknown>(key: string): T => {
      const val = config[key];
      if (val === undefined) throw new Error(`Config "${key}" not set`);
      return val as T;
    }),
  };
}

// ---------------------------------------------------------------------------
// Service construction helper
// ---------------------------------------------------------------------------

async function createService(options?: {
  magicLinks?: DbRow[];
  users?: DbRow[];
  config?: Record<string, unknown>;
}) {
  const mockDb = createMockDb();
  const mockEmail = createMockEmailService();
  const mockConfig = createMockConfigService(options?.config);

  // Seed data using the actual drizzle table name
  if (options?.magicLinks) {
    mockDb._seed('MagicLink', options.magicLinks);
  }
  if (options?.users) {
    mockDb._seed('AuthIdentity', options.users);
  }

  // Dynamically import to avoid server-only issues
  const { MagicLinkService } = await import('../magic-link.service');

  // Construct manually (bypass DI)
  const service = new (MagicLinkService as any)(
    mockDb,
    mockEmail,
    mockConfig,
  ) as InstanceType<typeof MagicLinkService>;

  return { service, mockDb, mockEmail, mockConfig };
}

// ---------------------------------------------------------------------------
// Tests: Token generation and hashing
// ---------------------------------------------------------------------------

describe('MagicLinkService', () => {
  describe('generateToken()', () => {
    it('should produce a base64url token and SHA-256 hash', async () => {
      const { service } = await createService();

      const { token, tokenHash } = await service.generateToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(20);

      // Token should be URL-safe base64 (no +, /, or =)
      expect(token).not.toMatch(/[+/=]/);

      expect(tokenHash).toBeDefined();
      expect(typeof tokenHash).toBe('string');
      // SHA-256 hex is 64 characters
      expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should produce unique tokens on each call', async () => {
      const { service } = await createService();

      const first = await service.generateToken();
      const second = await service.generateToken();

      expect(first.token).not.toBe(second.token);
      expect(first.tokenHash).not.toBe(second.tokenHash);
    });
  });

  describe('hashToken()', () => {
    it('should be deterministic (same input -> same output)', async () => {
      const { service } = await createService();

      const hash1 = await service.hashToken('test-token-abc');
      const hash2 = await service.hashToken('test-token-abc');

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', async () => {
      const { service } = await createService();

      const hash1 = await service.hashToken('token-1');
      const hash2 = await service.hashToken('token-2');

      expect(hash1).not.toBe(hash2);
    });

    it('should produce 64-character hex output', async () => {
      const { service } = await createService();

      const hash = await service.hashToken('any-token');

      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('request()', () => {
    it('should insert a magic link and send an email', async () => {
      const { service, mockDb, mockEmail } = await createService({
        users: [{ id: 'user-1', email: 'alice@example.com' }],
      });

      await service.request({ email: 'alice@example.com' });

      // Should have called insert
      expect(mockDb.insert).toHaveBeenCalled();

      // Should have sent an email
      expect(mockEmail.sendEmail).toHaveBeenCalledTimes(1);
      const [to, subject, html, text, template] = mockEmail.sendEmail.mock.calls[0];
      expect(to).toBe('alice@example.com');
      expect(subject).toContain('Sign in');
      expect(html).toContain('Sign In');
      expect(text).toContain('Sign in');
      expect(template).toBe('magic-link');
    });

    it('should silently return when rate limited (no email sent)', async () => {
      // Pre-fill with maxRequestsPerHour magic links
      const links: DbRow[] = [];
      for (let i = 0; i < DEFAULT_MAGIC_LINK_CONFIG.maxRequestsPerHour; i++) {
        links.push({
          id: `link-${i}`,
          email: 'alice@example.com',
          createdAt: new Date(),
        });
      }

      const { service, mockEmail } = await createService({
        magicLinks: links,
      });

      await service.request({ email: 'alice@example.com' });

      // Should NOT send email
      expect(mockEmail.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('verify()', () => {
    it('should return invalid for unknown token', async () => {
      const { service } = await createService();

      const result = await service.verify('nonexistent-token');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe('invalid');
      }
    });

    it('should return used for already-used token', async () => {
      const { service } = await createService({
        magicLinks: [
          {
            id: 'link-1',
            userId: 'user-1',
            email: 'alice@example.com',
            tokenHash: 'will-be-checked',
            expiresAt: new Date(Date.now() + 60_000),
            usedAt: new Date(), // Already used
            createdAt: new Date(),
          },
        ],
      });

      const result = await service.verify('some-token');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe('used');
      }
    });

    it('should return expired for an expired token', async () => {
      const { service } = await createService({
        magicLinks: [
          {
            id: 'link-1',
            userId: 'user-1',
            email: 'alice@example.com',
            tokenHash: 'will-be-checked',
            expiresAt: new Date(Date.now() - 60_000), // Expired
            usedAt: null,
            createdAt: new Date(),
          },
        ],
      });

      const result = await service.verify('some-token');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe('expired');
      }
    });

    it('should return user info for a valid token and mark it used', async () => {
      const { service, mockDb } = await createService({
        magicLinks: [
          {
            id: 'link-1',
            userId: 'user-1',
            email: 'alice@example.com',
            tokenHash: 'will-be-checked',
            expiresAt: new Date(Date.now() + 60_000),
            usedAt: null,
            redirectTo: '/dashboard',
            createdAt: new Date(),
          },
        ],
      });

      const result = await service.verify('some-valid-token');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.userId).toBe('user-1');
        expect(result.email).toBe('alice@example.com');
        expect(result.isNewUser).toBe(false);
        expect(result.redirectTo).toBe('/dashboard');
      }

      // Should have called update to mark as used
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('peek()', () => {
    it('should return valid=true for a valid unused token', async () => {
      const { service } = await createService({
        magicLinks: [
          {
            id: 'link-1',
            email: 'alice@example.com',
            tokenHash: 'will-be-checked',
            expiresAt: new Date(Date.now() + 60_000),
            usedAt: null,
            createdAt: new Date(),
          },
        ],
      });

      const result = await service.peek('some-token');

      expect(result.valid).toBe(true);
      expect(result.email).toBe('alice@example.com');
    });

    it('should return valid=false for an expired token', async () => {
      const { service } = await createService({
        magicLinks: [
          {
            id: 'link-1',
            email: 'alice@example.com',
            tokenHash: 'will-be-checked',
            expiresAt: new Date(Date.now() - 60_000),
            usedAt: null,
            createdAt: new Date(),
          },
        ],
      });

      const result = await service.peek('some-token');

      expect(result.valid).toBe(false);
      expect(result.email).toBeNull();
    });

    it('should return valid=false for a used token', async () => {
      const { service } = await createService({
        magicLinks: [
          {
            id: 'link-1',
            email: 'alice@example.com',
            tokenHash: 'will-be-checked',
            expiresAt: new Date(Date.now() + 60_000),
            usedAt: new Date(),
            createdAt: new Date(),
          },
        ],
      });

      const result = await service.peek('some-token');

      expect(result.valid).toBe(false);
      expect(result.email).toBeNull();
    });

    it('should return valid=false for a nonexistent token', async () => {
      const { service } = await createService();

      const result = await service.peek('nonexistent-token');

      expect(result.valid).toBe(false);
      expect(result.email).toBeNull();
    });
  });

  describe('cleanup()', () => {
    it('should delete expired and used links', async () => {
      const { service, mockDb } = await createService({
        magicLinks: [
          {
            id: 'expired-1',
            email: 'test@example.com',
            expiresAt: new Date(Date.now() - 60_000),
            usedAt: null,
            createdAt: new Date(Date.now() - 120_000),
          },
          {
            id: 'used-1',
            email: 'test@example.com',
            expiresAt: new Date(Date.now() + 60_000),
            usedAt: new Date(Date.now() - 90_000),
            createdAt: new Date(Date.now() - 100_000),
          },
        ],
      });

      const count = await service.cleanup();

      // Should have called delete twice (expired + used)
      expect(mockDb.delete).toHaveBeenCalledTimes(2);
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: buildMagicLinkEmail
// ---------------------------------------------------------------------------

describe('buildMagicLinkEmail', () => {
  it('should generate subject with app name', () => {
    const result = buildMagicLinkEmail({
      email: 'alice@example.com',
      magicLinkUrl: 'https://example.com/auth/magic-link/verify?token=abc',
      expiryMinutes: 15,
      appName: 'TestApp',
    });

    expect(result.subject).toBe('Sign in to TestApp');
  });

  it('should include magic link URL in HTML', () => {
    const url = 'https://example.com/auth/magic-link/verify?token=abc123';
    const result = buildMagicLinkEmail({
      email: 'alice@example.com',
      magicLinkUrl: url,
      expiryMinutes: 15,
      appName: 'TestApp',
    });

    expect(result.html).toContain(url);
    expect(result.html).toContain('alice@example.com');
    expect(result.html).toContain('15 minutes');
    expect(result.html).toContain('Sign In');
  });

  it('should include magic link URL in plain text', () => {
    const url = 'https://example.com/auth/magic-link/verify?token=abc123';
    const result = buildMagicLinkEmail({
      email: 'alice@example.com',
      magicLinkUrl: url,
      expiryMinutes: 10,
      appName: 'MyApp',
    });

    expect(result.text).toContain(url);
    expect(result.text).toContain('alice@example.com');
    expect(result.text).toContain('10 minutes');
  });

  it('should include expiry time in both HTML and text', () => {
    const result = buildMagicLinkEmail({
      email: 'bob@example.com',
      magicLinkUrl: 'https://example.com/verify',
      expiryMinutes: 30,
      appName: 'App',
    });

    expect(result.html).toContain('30 minutes');
    expect(result.text).toContain('30 minutes');
  });
});
