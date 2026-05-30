import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionService } from '@cruzjs/core/auth/session.service';
import { CacheServiceFactory } from '@cruzjs/core/shared/redis/cache.service';

// Mock dependencies
vi.mock('@cruzjs/core/shared/drizzle/drizzle.service');
vi.mock('@cruzjs/core/shared/redis/cache.service');

describe('SessionService', () => {
  let sessionService: SessionService;
  let mockDb: any;
  let mockCache: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Drizzle query builder pattern
    const createSelectBuilder = (returnValue: any = null) => {
      const builder = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(returnValue ? [returnValue] : []),
      };
      return builder;
    };

    const createInsertBuilder = (returnValue: any) => ({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([returnValue]),
    });

    const createUpdateBuilder = () => ({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue({ rowCount: 1 }),
    });

    const createDeleteBuilder = () => ({
      where: vi.fn().mockResolvedValue({ rowCount: 1 }),
    });

    mockDb = {
      select: vi.fn(() => createSelectBuilder()),
      insert: vi.fn(() => createInsertBuilder({})),
      update: vi.fn(() => createUpdateBuilder()),
      delete: vi.fn(() => createDeleteBuilder()),
    };

    // Mock Cache service
    mockCache = {
      set: vi.fn().mockResolvedValue(true),
      get: vi.fn(),
      delete: vi.fn().mockResolvedValue(true),
    };
    const mockCacheFactory = {
      create: () => mockCache,
    } as any;

    sessionService = new SessionService(mockDb, mockCacheFactory);
  });

  describe('createSession', () => {
    it('should create a session in both Redis and database', async () => {
      const input = {
        userId: 'user-123',
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1',
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([
          {
            id: 'session-123',
            sessionToken: 'hashed-token',
            userId: input.userId,
            expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            userAgent: input.userAgent,
            ipAddress: input.ipAddress,
          },
        ]),
      });

      const result = await sessionService.createSession(input);

      expect(result).toHaveProperty('token');
      expect(result.userId).toBe(input.userId);
      expect(result.userAgent).toBe(input.userAgent);
      expect(result.ipAddress).toBe(input.ipAddress);
      expect(result.expiresAt).toBeInstanceOf(Date);

      // Verify Redis storage
      expect(mockCache.set).toHaveBeenCalled();

      // Verify database storage
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should create session without optional fields', async () => {
      const input = {
        userId: 'user-123',
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([
          {
            id: 'session-123',
            sessionToken: 'hashed-token',
            userId: input.userId,
            expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            userAgent: null,
            ipAddress: null,
          },
        ]),
      });

      const result = await sessionService.createSession(input);

      expect(result.userId).toBe(input.userId);
      expect(result.userAgent).toBeUndefined();
      expect(result.ipAddress).toBeUndefined();
    });
  });

  describe('getSession', () => {
    it('should get session from Redis cache', async () => {
      const token = 'test-token';
      const sessionData = {
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1',
      };

      mockCache.get.mockResolvedValue(sessionData);

      const result = await sessionService.getSession(token);

      expect(result).toEqual(sessionData);
      expect(mockCache.get).toHaveBeenCalledWith(token);
    });

    it('should return null for expired session in cache', async () => {
      const token = 'test-token';
      const expiredSession = {
        userId: 'user-123',
        expiresAt: new Date(Date.now() - 1000), // Expired
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1',
      };

      mockCache.get.mockResolvedValue(expiredSession);
      mockCache.delete.mockResolvedValue(true);

      const result = await sessionService.getSession(token);

      expect(result).toBeNull();
      expect(mockCache.delete).toHaveBeenCalledWith(token);
    });

    it('should return null if session not found', async () => {
      const token = 'test-token';

      mockCache.get.mockResolvedValue(null);

      // Mock empty result from database
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      });

      const result = await sessionService.getSession(token);

      expect(result).toBeNull();
    });
  });

  describe('deleteSession', () => {
    it('should delete session from both Redis and database', async () => {
      const token = 'test-token';

      await sessionService.deleteSession(token);

      expect(mockCache.delete).toHaveBeenCalledWith(token);
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe('deleteAllSessions', () => {
    it('should delete all sessions for a user', async () => {
      const userId = 'user-123';
      const sessions = [{ sessionToken: 'hash1' }, { sessionToken: 'hash2' }];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(sessions),
      });

      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 2 }),
      });

      const result = await sessionService.deleteAllSessions(userId);

      expect(result).toBe(2);
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});
