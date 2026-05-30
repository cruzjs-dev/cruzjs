/**
 * Two-Factor Authentication Unit Tests
 *
 * Tests for TOTP provider, backup codes, trusted devices,
 * service behavior, and enforcement middleware.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TOTPProvider, base32Encode, base32Decode, timingSafeEqual } from '../totp.provider';
import { TwoFactorService } from '../two-factor.service';
import { twoFactorMiddleware } from '../two-factor.enforcement';
import { TwoFactorMethod } from '../two-factor.types';

// ─── TOTP Provider ───────────────────────────────────────────────────────────

describe('TOTPProvider', () => {
  describe('generateSecret', () => {
    it('should generate a base32 secret', async () => {
      const secret = await TOTPProvider.generateSecret();
      expect(secret).toBeTruthy();
      expect(typeof secret).toBe('string');
      // Base32 alphabet: A-Z, 2-7
      expect(secret).toMatch(/^[A-Z2-7]+$/);
    });

    it('should generate different secrets each time', async () => {
      const secret1 = await TOTPProvider.generateSecret();
      const secret2 = await TOTPProvider.generateSecret();
      expect(secret1).not.toBe(secret2);
    });

    it('should generate a secret of correct length (20 bytes = 32 base32 chars)', async () => {
      const secret = await TOTPProvider.generateSecret();
      expect(secret.length).toBe(32);
    });
  });

  describe('generateCode', () => {
    it('should generate a 6-digit code', async () => {
      const secret = await TOTPProvider.generateSecret();
      const code = await TOTPProvider.generateCode(secret);
      expect(code).toMatch(/^\d{6}$/);
    });

    it('should generate the same code for the same secret within the same window', async () => {
      const secret = await TOTPProvider.generateSecret();
      const code1 = await TOTPProvider.generateCode(secret);
      const code2 = await TOTPProvider.generateCode(secret);
      expect(code1).toBe(code2);
    });
  });

  describe('verifyCode', () => {
    it('should verify a valid code', async () => {
      const secret = await TOTPProvider.generateSecret();
      const code = await TOTPProvider.generateCode(secret);
      const valid = await TOTPProvider.verifyCode(secret, code);
      expect(valid).toBe(true);
    });

    it('should reject an invalid code', async () => {
      const secret = await TOTPProvider.generateSecret();
      const valid = await TOTPProvider.verifyCode(secret, '000000');
      // Could match by chance, but extremely unlikely
      const code = await TOTPProvider.generateCode(secret);
      if (code !== '000000') {
        expect(valid).toBe(false);
      }
    });

    it('should reject codes from a different secret', async () => {
      const secret1 = await TOTPProvider.generateSecret();
      const secret2 = await TOTPProvider.generateSecret();
      const code1 = await TOTPProvider.generateCode(secret1);
      // Verify code1 against secret2 should fail (unless by coincidence)
      const code2 = await TOTPProvider.generateCode(secret2);
      if (code1 !== code2) {
        const valid = await TOTPProvider.verifyCode(secret2, code1);
        expect(valid).toBe(false);
      }
    });

    it('should accept codes within the clock skew window', async () => {
      const secret = await TOTPProvider.generateSecret();
      // Generate code for the current time step
      const code = await TOTPProvider.generateCode(secret);
      // Verify with window=1 (default) — should accept current step
      const valid = await TOTPProvider.verifyCode(secret, code, 1);
      expect(valid).toBe(true);
    });

    it('should accept codes with zero window when code is current', async () => {
      const secret = await TOTPProvider.generateSecret();
      const code = await TOTPProvider.generateCode(secret);
      const valid = await TOTPProvider.verifyCode(secret, code, 0);
      expect(valid).toBe(true);
    });
  });

  describe('generateOtpAuthUri', () => {
    it('should generate a valid otpauth URI', () => {
      const uri = TOTPProvider.generateOtpAuthUri('JBSWY3DPEHPK3PXP', 'user@example.com', 'MyApp');
      expect(uri).toContain('otpauth://totp/');
      expect(uri).toContain('secret=JBSWY3DPEHPK3PXP');
      expect(uri).toContain('issuer=MyApp');
      expect(uri).toContain('algorithm=SHA1');
      expect(uri).toContain('digits=6');
      expect(uri).toContain('period=30');
    });

    it('should encode special characters in label and issuer', () => {
      const uri = TOTPProvider.generateOtpAuthUri('SECRET', 'user@test.com', 'My App & Co');
      expect(uri).toContain(encodeURIComponent('My App & Co'));
    });
  });
});

// ─── Base32 ──────────────────────────────────────────────────────────────────

describe('Base32', () => {
  it('should encode and decode correctly', () => {
    const original = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const encoded = base32Encode(original);
    const decoded = base32Decode(encoded);
    expect(decoded).toEqual(original);
  });

  it('should handle empty input', () => {
    const encoded = base32Encode(new Uint8Array(0));
    expect(encoded).toBe('');
  });

  it('should throw on invalid base32 characters', () => {
    expect(() => base32Decode('INVALID!@#')).toThrow('Invalid base32 character');
  });
});

// ─── Timing Safe Equal ───────────────────────────────────────────────────────

describe('timingSafeEqual', () => {
  it('should return true for equal strings', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true);
  });

  it('should return false for different strings', () => {
    expect(timingSafeEqual('abc', 'xyz')).toBe(false);
  });

  it('should return false for different length strings', () => {
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
  });
});

// ─── TwoFactorService ───────────────────────────────────────────────────────

describe('TwoFactorService', () => {
  // Mock Drizzle database
  let mockDb: Record<string, unknown>;
  let service: TwoFactorService;
  let storedRows: Array<Record<string, unknown>>;
  let storedDevices: Array<Record<string, unknown>>;

  beforeEach(() => {
    storedRows = [];
    storedDevices = [];

    // Build a chainable mock for Drizzle
    const createChain = (resolveValue: unknown = []) => {
      const chain: Record<string, unknown> = {};
      const methods = ['select', 'from', 'where', 'limit', 'insert', 'values', 'returning', 'update', 'set', 'delete'];
      for (const m of methods) {
        chain[m] = vi.fn().mockReturnValue(chain);
      }
      // Terminal methods return the value
      chain['limit'] = vi.fn().mockResolvedValue(resolveValue);
      chain['returning'] = vi.fn().mockResolvedValue(resolveValue);
      // select().from().where() should be thenable
      return chain;
    };

    mockDb = createChain();

    // Create service with mock db, no adapter, and a mock config
    const mockConfig = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'APP_NAME') return 'TestApp';
        if (key === 'TWO_FACTOR_ENCRYPTION_KEY') return 'test-encryption-key-32chars!!';
        return undefined;
      }),
    };

    service = new TwoFactorService(
      mockDb as any,
      undefined,
      mockConfig as any,
    );
  });

  describe('Backup codes', () => {
    it('should hash a backup code to a hex string', async () => {
      const hash = await service.hashBackupCode('abcd1234');
      expect(hash).toMatch(/^[0-9a-f]{64}$/); // SHA-256 = 64 hex chars
    });

    it('should produce the same hash for the same code', async () => {
      const hash1 = await service.hashBackupCode('testcode');
      const hash2 = await service.hashBackupCode('testcode');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different codes', async () => {
      const hash1 = await service.hashBackupCode('code1');
      const hash2 = await service.hashBackupCode('code2');
      expect(hash1).not.toBe(hash2);
    });

    it('should normalize case when hashing', async () => {
      const hash1 = await service.hashBackupCode('ABCD1234');
      const hash2 = await service.hashBackupCode('abcd1234');
      expect(hash1).toBe(hash2);
    });
  });

  describe('Encryption', () => {
    it('should encrypt and decrypt a secret round-trip', () => {
      const original = 'JBSWY3DPEHPK3PXP';
      const encrypted = service.encryptSecret(original);
      expect(encrypted).not.toBe(original);

      const decrypted = service.decryptSecret(encrypted);
      expect(decrypted).toBe(original);
    });

    it('should produce different ciphertext than plaintext', () => {
      const original = 'MY_SECRET_KEY';
      const encrypted = service.encryptSecret(original);
      expect(encrypted).not.toBe(original);
    });
  });
});

// ─── Enforcement Middleware ──────────────────────────────────────────────────

describe('twoFactorMiddleware', () => {
  it('should pass through when policy is not required', async () => {
    const middleware = twoFactorMiddleware({ required: false });
    const next = vi.fn().mockResolvedValue({ data: 'ok' });
    const ctx = { session: { user: { id: 'user-1' } }, container: null };

    const result = await middleware({ ctx, next });
    expect(next).toHaveBeenCalled();
    expect(result).toEqual({ data: 'ok' });
  });

  it('should throw UNAUTHORIZED when no user session', async () => {
    const middleware = twoFactorMiddleware({ required: true });
    const next = vi.fn();
    const ctx = { session: null, container: null };

    await expect(middleware({ ctx, next })).rejects.toThrow('Authentication required');
    expect(next).not.toHaveBeenCalled();
  });

  it('should pass through when 2FA service is not available (module not loaded)', async () => {
    const middleware = twoFactorMiddleware({ required: true });
    const next = vi.fn().mockResolvedValue({ data: 'ok' });
    const ctx = {
      session: { user: { id: 'user-1' } },
      container: { resolve: vi.fn().mockReturnValue(undefined) },
    };

    const result = await middleware({ ctx, next });
    expect(next).toHaveBeenCalled();
  });

  it('should throw FORBIDDEN when 2FA is required but not enabled', async () => {
    const middleware = twoFactorMiddleware({ required: true });
    const next = vi.fn();

    const mockService = {
      isEnabled: vi.fn().mockResolvedValue(false),
      getMethods: vi.fn().mockResolvedValue([]),
    };

    const ctx = {
      session: { user: { id: 'user-1' } },
      container: { resolve: vi.fn().mockReturnValue(mockService) },
    };

    await expect(middleware({ ctx, next })).rejects.toThrow('Two-factor authentication is required');
    expect(next).not.toHaveBeenCalled();
  });

  it('should pass through when 2FA is required and user has it enabled', async () => {
    const middleware = twoFactorMiddleware({ required: true });
    const next = vi.fn().mockResolvedValue({ data: 'ok' });

    const mockService = {
      isEnabled: vi.fn().mockResolvedValue(true),
      getMethods: vi.fn().mockResolvedValue([TwoFactorMethod.TOTP]),
    };

    const ctx = {
      session: { user: { id: 'user-1' } },
      container: { resolve: vi.fn().mockReturnValue(mockService) },
    };

    const result = await middleware({ ctx, next });
    expect(next).toHaveBeenCalled();
  });

  it('should throw FORBIDDEN when user method is not in allowed list', async () => {
    const middleware = twoFactorMiddleware({
      required: true,
      allowedMethods: [TwoFactorMethod.TOTP],
    });
    const next = vi.fn();

    const mockService = {
      isEnabled: vi.fn().mockResolvedValue(true),
      getMethods: vi.fn().mockResolvedValue([TwoFactorMethod.SMS]),
    };

    const ctx = {
      session: { user: { id: 'user-1' } },
      container: { resolve: vi.fn().mockReturnValue(mockService) },
    };

    await expect(middleware({ ctx, next })).rejects.toThrow('must use one of');
    expect(next).not.toHaveBeenCalled();
  });
});

// ─── TwoFactorMethod Enum ───────────────────────────────────────────────────

describe('TwoFactorMethod', () => {
  it('should have correct values', () => {
    expect(TwoFactorMethod.TOTP).toBe('totp');
    expect(TwoFactorMethod.SMS).toBe('sms');
    expect(TwoFactorMethod.EMAIL).toBe('email');
  });
});
