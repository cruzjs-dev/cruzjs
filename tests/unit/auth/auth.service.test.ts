import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '@cruzjs/core/auth/auth.service';
import { SessionService } from '@cruzjs/core/auth/session.service';

// Mock dependencies
vi.mock('@cruzjs/core/shared/drizzle/drizzle.service');
vi.mock('@cruzjs/core/auth/session.service', () => ({
  SessionService: vi.fn(),
}));
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

import bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let authService: AuthService;
  let mockDb: any;
  let mockSessionService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Drizzle query builder pattern
    const createQueryBuilder = (returnValue: any = null) => ({
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(returnValue ? [returnValue] : []),
      orderBy: vi.fn().mockReturnThis(),
    });

    const createInsertBuilder = (returnValue: any) => ({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([returnValue]),
    });

    const createUpdateBuilder = () => ({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue({ rowCount: 1 }),
    });

    mockDb = {
      select: vi.fn(() => createQueryBuilder()),
      insert: vi.fn(() => createInsertBuilder({})),
      update: vi.fn(() => createUpdateBuilder()),
      delete: vi.fn().mockReturnThis(),
    };

    mockSessionService = {
      createSession: vi.fn(),
      deleteAllSessions: vi.fn(),
    };

    const mockJobService = {
      createJob: vi.fn().mockResolvedValue({ id: 'job-123' }),
    } as any;

    const mockConfigService = {
      get: vi.fn(),
      getOrThrow: vi.fn().mockReturnValue('http://localhost:3000'),
    } as any;

    authService = new AuthService(
      mockDb,
      mockSessionService,
      mockJobService,
      mockConfigService
    );
  });

  describe('hashPassword', () => {
    it('should hash password using bcrypt', async () => {
      const password = 'TestPassword123';
      const hashed = 'hashed_password';
      (bcrypt.hash as any).mockResolvedValue(hashed);

      const result = await authService.hashPassword(password);

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(result).toBe(hashed);
    });
  });

  describe('verifyPassword', () => {
    it('should verify password against hash', async () => {
      const password = 'TestPassword123';
      const hash = 'hashed_password';
      (bcrypt.compare as any).mockResolvedValue(true);

      const result = await authService.verifyPassword(password, hash);

      expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for invalid password', async () => {
      const password = 'WrongPassword';
      const hash = 'hashed_password';
      (bcrypt.compare as any).mockResolvedValue(false);

      const result = await authService.verifyPassword(password, hash);

      expect(result).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should accept valid password', () => {
      expect(authService.validatePasswordStrength('Test1234')).toBe(true);
      expect(authService.validatePasswordStrength('MyP@ssw0rd')).toBe(true);
    });

    it('should reject password shorter than 8 characters', () => {
      expect(authService.validatePasswordStrength('Test123')).toBe(false);
    });

    it('should reject password without uppercase', () => {
      expect(authService.validatePasswordStrength('test1234')).toBe(false);
    });

    it('should reject password without lowercase', () => {
      expect(authService.validatePasswordStrength('TEST1234')).toBe(false);
    });

    it('should reject password without number', () => {
      expect(authService.validatePasswordStrength('TestPassword')).toBe(false);
    });
  });
});
