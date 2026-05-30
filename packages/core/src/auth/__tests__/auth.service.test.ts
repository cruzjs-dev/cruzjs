import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'reflect-metadata';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { DrizzleCruzDatabase } from '../../shared/database/drizzle-cruz-database';
import type { AnyDialectDatabase } from '../../shared/database/cruz-database';
import { AuthService } from '../auth.service';

// ── In-memory database setup ────────────────────────────────────────────────

/**
 * Create a fresh in-memory SQLite database with auth tables.
 * Uses raw SQL to create tables matching the core schema, avoiding
 * the complex cross-package import chain.
 */
function createAuthTestDb() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');

  sqlite.exec(`
    CREATE TABLE AuthIdentity (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      emailVerified TEXT,
      emailVerificationToken TEXT UNIQUE,
      password TEXT,
      passwordResetToken TEXT UNIQUE,
      passwordResetExpiry TEXT,
      isBanned INTEGER DEFAULT 0,
      deletionRequestedAt TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  sqlite.exec(`
    CREATE TABLE Session (
      id TEXT PRIMARY KEY,
      sessionToken TEXT NOT NULL UNIQUE,
      userId TEXT NOT NULL,
      currentOrgId TEXT,
      expiresAt TEXT NOT NULL,
      csrfToken TEXT,
      userAgent TEXT,
      ipAddress TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES AuthIdentity(id) ON DELETE CASCADE
    );
  `);

  const rawDb = drizzle(sqlite);
  return DrizzleCruzDatabase.create(rawDb as AnyDialectDatabase);
}

// ── Mock dependencies ───────────────────────────────────────────────────────

function createMockSessionService() {
  return {
    createSession: vi.fn().mockResolvedValue({
      token: 'mock-session-token-abc',
      userId: 'user-1',
      currentOrgId: null,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    }),
    deleteAllSessions: vi.fn().mockResolvedValue(0),
    deleteSession: vi.fn().mockResolvedValue(undefined),
    getSession: vi.fn().mockResolvedValue(null),
  };
}

function createMockJobService() {
  return {
    createJob: vi.fn().mockResolvedValue({ id: 'job-1' }),
    cancelByLookupKey: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockConfigService() {
  return {
    get: vi.fn().mockReturnValue('http://localhost:3000'),
    getOrThrow: vi.fn().mockReturnValue('http://localhost:3000'),
  };
}

function createMockEventEmitter() {
  return {
    dispatch: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let authService: AuthService;
  let mockSession: ReturnType<typeof createMockSessionService>;
  let mockJobs: ReturnType<typeof createMockJobService>;
  let mockConfig: ReturnType<typeof createMockConfigService>;
  let mockEvents: ReturnType<typeof createMockEventEmitter>;
  let db: ReturnType<typeof createAuthTestDb>;

  beforeEach(() => {
    db = createAuthTestDb();
    mockSession = createMockSessionService();
    mockJobs = createMockJobService();
    mockConfig = createMockConfigService();
    mockEvents = createMockEventEmitter();

    // Construct AuthService manually, bypassing DI container.
    // AuthService constructor: (db, sessionService, jobService, configService, events)
    authService = new (AuthService as any)(
      db,
      mockSession,
      mockJobs,
      mockConfig,
      mockEvents,
    );
  });

  // ── Password hashing ──────────────────────────────────────────────────────

  describe('hashPassword / verifyPassword', () => {
    it('should hash a password and verify it correctly', async () => {
      const password = 'SecurePass1';
      const hash = await authService.hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);

      const isValid = await authService.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const hash = await authService.hashPassword('CorrectPass1');
      const isValid = await authService.verifyPassword('WrongPass1', hash);
      expect(isValid).toBe(false);
    });
  });

  // ── Password strength validation ──────────────────────────────────────────

  describe('validatePasswordStrength', () => {
    it('should accept a valid password', () => {
      expect(authService.validatePasswordStrength('Abcdefg1')).toBe(true);
    });

    it('should reject passwords shorter than 8 characters', () => {
      expect(authService.validatePasswordStrength('Ab1')).toBe(false);
    });

    it('should reject passwords without uppercase', () => {
      expect(authService.validatePasswordStrength('abcdefg1')).toBe(false);
    });

    it('should reject passwords without lowercase', () => {
      expect(authService.validatePasswordStrength('ABCDEFG1')).toBe(false);
    });

    it('should reject passwords without a number', () => {
      expect(authService.validatePasswordStrength('Abcdefgh')).toBe(false);
    });
  });

  // ── Registration ──────────────────────────────────────────────────────────

  describe('register', () => {
    it('should create an identity and return auth response', async () => {
      const result = await authService.register({
        email: 'test@example.com',
        password: 'SecurePass1',
        name: 'Test User',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.user.id).toBeDefined();
      expect(result.session.token).toBe('mock-session-token-abc');

      // Session was created
      expect(mockSession.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: result.user.id,
          currentOrgId: null,
        }),
      );

      // Verification email was queued
      expect(mockJobs.createJob).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'send-email',
          priority: 'HIGH',
        }),
      );

      // Event was dispatched
      expect(mockEvents.dispatch).toHaveBeenCalledTimes(1);
    });

    it('should store a hashed password, not the plaintext', async () => {
      const password = 'SecurePass1';
      const result = await authService.register({
        email: 'hash-check@example.com',
        password,
      });

      // The response must not include the password
      expect(result.user).not.toHaveProperty('password');

      // Verify by logging in: the hashed password in the DB must match
      const loginResult = await authService.login({
        email: 'hash-check@example.com',
        password,
      });
      expect(loginResult.user.email).toBe('hash-check@example.com');

      // Wrong password must fail, proving the hash was stored (not plaintext)
      await expect(
        authService.login({
          email: 'hash-check@example.com',
          password: 'WrongPassword1',
        }),
      ).rejects.toThrow('Invalid email or password');
    });

    it('should lowercase the email on registration', async () => {
      const result = await authService.register({
        email: 'UpperCase@Example.COM',
        password: 'SecurePass1',
      });

      expect(result.user.email).toBe('uppercase@example.com');
    });

    it('should throw for duplicate email', async () => {
      await authService.register({
        email: 'dup@example.com',
        password: 'SecurePass1',
      });

      await expect(
        authService.register({
          email: 'dup@example.com',
          password: 'SecurePass2',
        }),
      ).rejects.toThrow('User with this email already exists');
    });

    it('should throw for weak password', async () => {
      await expect(
        authService.register({
          email: 'weak@example.com',
          password: 'weak',
        }),
      ).rejects.toThrow('Password must be at least 8 characters');
    });
  });

  // ── Login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    beforeEach(async () => {
      // Register a user to login with
      await authService.register({
        email: 'login@example.com',
        password: 'SecurePass1',
        name: 'Login User',
      });
      // Reset mock call counts
      mockSession.createSession.mockClear();
      mockJobs.createJob.mockClear();
      mockEvents.dispatch.mockClear();
    });

    it('should return auth response with correct password', async () => {
      const result = await authService.login({
        email: 'login@example.com',
        password: 'SecurePass1',
      });

      expect(result.user.email).toBe('login@example.com');
      expect(result.session.token).toBe('mock-session-token-abc');
      expect(mockSession.createSession).toHaveBeenCalledTimes(1);
    });

    it('should throw for wrong password', async () => {
      await expect(
        authService.login({
          email: 'login@example.com',
          password: 'WrongPass1',
        }),
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw for non-existent email', async () => {
      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'SecurePass1',
        }),
      ).rejects.toThrow('Invalid email or password');
    });

    it('should lowercase the email on login', async () => {
      const result = await authService.login({
        email: 'LOGIN@Example.COM',
        password: 'SecurePass1',
      });

      expect(result.user.email).toBe('login@example.com');
    });
  });
});
