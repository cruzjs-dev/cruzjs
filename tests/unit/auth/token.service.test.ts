// TokenService tests
// The TokenService is a class with injectable dependencies

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TokenService } from '@cruzjs/core/auth/token.service';

// Mock dependencies
vi.mock('@cruzjs/core/shared/drizzle/drizzle.service');
vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
  },
}));

import jwt from 'jsonwebtoken';

describe('TokenService', () => {
  let tokenService: TokenService;
  let mockDb: any;
  let mockConfigService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Drizzle query builder pattern
    const createSelectBuilder = (returnValue: any = null) => ({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(returnValue ? [returnValue] : []),
    });

    const createInsertBuilder = (returnValue: any) => ({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([returnValue]),
    });

    const createDeleteBuilder = () => ({
      where: vi.fn().mockResolvedValue({ rowCount: 1 }),
    });

    mockDb = {
      select: vi.fn(() => createSelectBuilder()),
      insert: vi.fn(() => createInsertBuilder({})),
      delete: vi.fn(() => createDeleteBuilder()),
    };

    mockConfigService = {
      get: vi.fn(),
      getOrThrow: vi.fn().mockReturnValue('test-jwt-secret'),
    };

    tokenService = new TokenService(mockDb, mockConfigService);
  });

  describe('generateAccessToken', () => {
    it('should generate a JWT access token', () => {
      const userId = 'user-123';
      const expectedToken = 'jwt-token';
      (jwt.sign as any).mockReturnValue(expectedToken);

      const result = tokenService.generateAccessToken(userId);

      expect(jwt.sign).toHaveBeenCalledWith({ userId }, 'test-jwt-secret', {
        expiresIn: '15m',
      });
      expect(result).toBe(expectedToken);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid JWT token', () => {
      const token = 'valid-token';
      const payload = { userId: 'user-123' };
      (jwt.verify as any).mockReturnValue(payload);

      const result = tokenService.verifyAccessToken(token);

      expect(jwt.verify).toHaveBeenCalledWith(token, 'test-jwt-secret');
      expect(result).toEqual(payload);
    });

    it('should return null for invalid token', () => {
      const token = 'invalid-token';
      (jwt.verify as any).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = tokenService.verifyAccessToken(token);

      expect(result).toBeNull();
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate and store a refresh token', async () => {
      const userId = 'user-123';

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([
          {
            id: 'token-123',
            token: 'hashed-token',
            userId,
            expiresAt: new Date(),
          },
        ]),
      });

      const result = await tokenService.generateRefreshToken(userId);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBe(64); // 32 bytes hex encoded
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', async () => {
      const token = 'valid-refresh-token';
      const userId = 'user-123';

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: 'token-123',
            userId,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
          },
        ]),
      });

      const result = await tokenService.verifyRefreshToken(token);

      expect(result).toBe(userId);
    });

    it('should return null for non-existent token', async () => {
      const token = 'non-existent-token';

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      });

      const result = await tokenService.verifyRefreshToken(token);

      expect(result).toBeNull();
    });

    it('should return null and delete expired token', async () => {
      const token = 'expired-token';

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: 'token-123',
            userId: 'user-123',
            expiresAt: new Date(Date.now() - 1000), // Expired
          },
        ]),
      });

      const result = await tokenService.verifyRefreshToken(token);

      expect(result).toBeNull();
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe('revokeRefreshToken', () => {
    it('should revoke a refresh token', async () => {
      const token = 'token-to-revoke';

      await tokenService.revokeRefreshToken(token);

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe('revokeAllRefreshTokens', () => {
    it('should revoke all refresh tokens for a user', async () => {
      const userId = 'user-123';

      await tokenService.revokeAllRefreshTokens(userId);

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});
