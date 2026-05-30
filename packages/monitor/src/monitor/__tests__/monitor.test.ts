/**
 * Monitor Service Tests
 *
 * Verifies entry recording, filtering, clearing, pruning, and stats.
 * Uses a mock Drizzle database to test service logic in isolation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { MonitorService } from '../monitor.service';
import type { MonitorEntryType, RecordEntryInput } from '../monitor.types';

// ---------------------------------------------------------------------------
// Mock database layer
// ---------------------------------------------------------------------------

type MockRow = {
  id: string;
  type: string;
  content: string;
  familyHash: string | null;
  batchId: string | null;
  tags: string;
  status: string;
  duration: number | null;
  createdAt: string;
};

let store: MockRow[] = [];
let idCounter = 0;

function createMockDb() {
  return {
    insert: vi.fn(() => ({
      values: vi.fn((values: Record<string, unknown>) => {
        const row: MockRow = {
          id: `entry-${++idCounter}`,
          type: values.type as string,
          content: values.content as string,
          familyHash: (values.familyHash as string) ?? null,
          batchId: (values.batchId as string) ?? null,
          tags: (values.tags as string) ?? '[]',
          status: (values.status as string) ?? 'success',
          duration: (values.duration as number) ?? null,
          createdAt: new Date().toISOString(),
        };
        store.push(row);
        return { returning: vi.fn(() => [row]) };
      }),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => [...store]),
          })),
          limit: vi.fn((n: number) => store.slice(0, n)),
        })),
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => [...store]),
        })),
        groupBy: vi.fn(() => {
          const groups: Record<string, number> = {};
          for (const row of store) {
            groups[row.type] = (groups[row.type] ?? 0) + 1;
          }
          return Object.entries(groups).map(([type, count]) => ({ type, count }));
        }),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn((condition?: unknown) => {
        if (!condition) {
          const deleted = [...store];
          store = [];
          return { returning: vi.fn(() => deleted) };
        }
        // For prune — simulate deleting old entries
        const deleted = store.filter(() => false); // simplified
        return { returning: vi.fn(() => deleted) };
      }),
    })),
  };
}

function createMockConfig() {
  return {
    get: vi.fn((key: string, defaultVal: string) => defaultVal),
    getOrThrow: vi.fn(),
  };
}

function createService(dbOverride?: unknown, configOverride?: unknown): MonitorService {
  const db = dbOverride ?? createMockDb();
  const config = configOverride ?? createMockConfig();
  return new (MonitorService as any)(db, config) as MonitorService;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MonitorService', () => {
  beforeEach(() => {
    store = [];
    idCounter = 0;
  });

  describe('record', () => {
    it('should insert a monitor entry', async () => {
      const service = createService();

      await service.record({
        type: 'request',
        content: { method: 'GET', url: '/api/health' },
        status: 'success',
        duration: 42,
      });

      expect(store).toHaveLength(1);
      expect(store[0].type).toBe('request');
      expect(store[0].status).toBe('success');
      expect(store[0].duration).toBe(42);
    });

    it('should no-op when monitoring is disabled', async () => {
      const config = {
        get: vi.fn((key: string) => (key === 'MONITOR_ENABLED' ? 'false' : 'true')),
        getOrThrow: vi.fn(),
      };
      const service = createService(undefined, config);

      await service.record({
        type: 'request',
        content: { method: 'GET' },
      });

      expect(store).toHaveLength(0);
    });

    it('should default status to success', async () => {
      const service = createService();

      await service.record({
        type: 'query',
        content: { sql: 'SELECT 1' },
      });

      expect(store[0].status).toBe('success');
    });

    it('should serialize tags as JSON array', async () => {
      const service = createService();

      await service.record({
        type: 'cache',
        content: { key: 'users:1' },
        tags: ['cache', 'hit'],
      });

      expect(JSON.parse(store[0].tags)).toEqual(['cache', 'hit']);
    });
  });

  describe('list', () => {
    it('should return all entries when no filters provided', async () => {
      const service = createService();

      await service.record({ type: 'request', content: { url: '/a' } });
      await service.record({ type: 'query', content: { sql: 'SELECT' } });

      const results = await service.list();
      expect(results).toHaveLength(2);
    });

    it('should filter by type', async () => {
      // Build a custom mock that respects the type filter
      const mockDb = createMockDb();
      const originalSelect = mockDb.select;
      mockDb.select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => store.filter((r) => r.type === 'request')),
            })),
          })),
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => store),
          })),
          groupBy: vi.fn(() => []),
        })),
      })) as any;

      const service = createService(mockDb);

      await service.record({ type: 'request', content: { url: '/a' } });
      await service.record({ type: 'query', content: { sql: 'SELECT' } });

      const results = await service.list({ type: 'request' });
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('request');
    });

    it('should filter by tag', async () => {
      const service = createService();

      await service.record({ type: 'cache', content: {}, tags: ['cache', 'hit'] });
      await service.record({ type: 'cache', content: {}, tags: ['cache', 'miss'] });

      const results = await service.list({ tag: 'hit' });
      expect(results).toHaveLength(1);
      expect(results[0].tags).toContain('hit');
    });
  });

  describe('clear', () => {
    it('should delete all entries when no type specified', async () => {
      const deleteWhereFn = vi.fn(() => ({ returning: vi.fn(() => []) }));
      const deleteFn = vi.fn(() => ({ where: deleteWhereFn }));
      const mockDb = createMockDb();
      mockDb.delete = deleteFn as any;

      const service = createService(mockDb);
      await service.clear();

      expect(deleteFn).toHaveBeenCalled();
    });

    it('should delete entries filtered by type', async () => {
      const deleteWhereFn = vi.fn(() => ({ returning: vi.fn(() => []) }));
      const deleteFn = vi.fn(() => ({ where: deleteWhereFn }));
      const mockDb = createMockDb();
      mockDb.delete = deleteFn as any;

      const service = createService(mockDb);
      await service.clear('request');

      expect(deleteFn).toHaveBeenCalled();
      expect(deleteWhereFn).toHaveBeenCalled();
    });
  });

  describe('prune', () => {
    it('should delete old entries and return count', async () => {
      const deletedRows = [{ id: '1' }, { id: '2' }, { id: '3' }];
      const deleteWhereFn = vi.fn(() => ({
        returning: vi.fn(() => deletedRows),
      }));
      const deleteFn = vi.fn(() => ({ where: deleteWhereFn }));
      const mockDb = createMockDb();
      mockDb.delete = deleteFn as any;

      const service = createService(mockDb);
      const count = await service.prune(24);

      expect(deleteFn).toHaveBeenCalled();
      expect(count).toBe(3);
    });

    it('should default to 24 hours', async () => {
      const deleteWhereFn = vi.fn(() => ({
        returning: vi.fn(() => []),
      }));
      const deleteFn = vi.fn(() => ({ where: deleteWhereFn }));
      const mockDb = createMockDb();
      mockDb.delete = deleteFn as any;

      const service = createService(mockDb);
      const count = await service.prune();

      expect(count).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return counts per type', async () => {
      const service = createService();

      await service.record({ type: 'request', content: {} });
      await service.record({ type: 'request', content: {} });
      await service.record({ type: 'query', content: {} });

      const stats = await service.getStats();

      expect(stats.request).toBe(2);
      expect(stats.query).toBe(1);
      expect(stats.job).toBe(0);
      expect(stats.event).toBe(0);
      expect(stats.mail).toBe(0);
      expect(stats.notification).toBe(0);
      expect(stats.cache).toBe(0);
      expect(stats.exception).toBe(0);
    });

    it('should return all zeros when no entries exist', async () => {
      const mockDb = createMockDb();
      const service = createService(mockDb);

      const stats = await service.getStats();

      expect(stats.request).toBe(0);
      expect(stats.query).toBe(0);
      expect(stats.job).toBe(0);
    });
  });
});
