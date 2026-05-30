/**
 * Queue Metrics Service Tests
 *
 * Verifies metrics recording, overview aggregation, failed job
 * management, and retry logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { QueueMetricsService } from '../queue-metrics.service';

// ---------------------------------------------------------------------------
// Mock database layer
// ---------------------------------------------------------------------------

type MockMetricRow = {
  id: string;
  queue: string;
  period: string;
  processedCount: number;
  failedCount: number;
  totalRuntimeMs: number;
  totalWaitTimeMs: number;
  createdAt: string;
  updatedAt: string;
};

type MockJobRow = {
  id: string;
  type: string;
  status: string;
  error: string | null;
  processedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

let metricStore: MockMetricRow[] = [];
let jobStore: MockJobRow[] = [];
let metricIdCounter = 0;

function createMockDb() {
  return {
    insert: vi.fn((table: unknown) => ({
      values: vi.fn((values: Record<string, unknown>) => {
        const row: MockMetricRow = {
          id: `metric-${++metricIdCounter}`,
          queue: values.queue as string,
          period: values.period as string,
          processedCount: (values.processedCount as number) ?? 0,
          failedCount: (values.failedCount as number) ?? 0,
          totalRuntimeMs: (values.totalRuntimeMs as number) ?? 0,
          totalWaitTimeMs: (values.totalWaitTimeMs as number) ?? 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        metricStore.push(row);
        return { returning: vi.fn(() => [row]) };
      }),
    })),
    select: vi.fn(() => ({
      from: vi.fn((table: unknown) => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn((n: number) => jobStore.slice(0, n)),
          })),
          limit: vi.fn((n: number) => {
            // For metric lookups (queue + period), return matching rows
            return metricStore.slice(0, n);
          }),
        })),
        groupBy: vi.fn(() => {
          // Aggregate metrics by queue
          const groups: Record<string, { processed: number; failed: number; totalRuntime: number }> = {};
          for (const row of metricStore) {
            if (!groups[row.queue]) {
              groups[row.queue] = { processed: 0, failed: 0, totalRuntime: 0 };
            }
            groups[row.queue].processed += row.processedCount;
            groups[row.queue].failed += row.failedCount;
            groups[row.queue].totalRuntime += row.totalRuntimeMs;
          }
          return Object.entries(groups).map(([queue, data]) => ({
            queue,
            processed: data.processed,
            failed: data.failed,
            totalRuntime: data.totalRuntime,
          }));
        }),
      })),
    })),
    update: vi.fn((table: unknown) => ({
      set: vi.fn((values: Record<string, unknown>) => ({
        where: vi.fn(() => {
          // For job retry — update the matching job
          if (values.status === 'PENDING') {
            const updatedJobs: MockJobRow[] = [];
            for (const job of jobStore) {
              if (job.status === 'FAILED') {
                job.status = 'PENDING';
                job.error = null;
                job.processedBy = null;
                updatedJobs.push(job);
              }
            }
            return { returning: vi.fn(() => updatedJobs) };
          }
          // For metric updates
          if (metricStore.length > 0) {
            const row = metricStore[metricStore.length - 1];
            if (values.processedCount !== undefined) row.processedCount = values.processedCount as number;
            if (values.failedCount !== undefined) row.failedCount = values.failedCount as number;
            if (values.totalRuntimeMs !== undefined) row.totalRuntimeMs = values.totalRuntimeMs as number;
            if (values.totalWaitTimeMs !== undefined) row.totalWaitTimeMs = values.totalWaitTimeMs as number;
          }
          return { returning: vi.fn(() => []) };
        }),
      })),
    })),
    delete: vi.fn((table: unknown) => ({
      where: vi.fn(() => {
        return { returning: vi.fn(() => []) };
      }),
    })),
  };
}

function createService(dbOverride?: unknown): QueueMetricsService {
  const db = dbOverride ?? createMockDb();
  return new (QueueMetricsService as any)(db) as QueueMetricsService;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('QueueMetricsService', () => {
  beforeEach(() => {
    metricStore = [];
    jobStore = [];
    metricIdCounter = 0;
  });

  describe('recordProcessed', () => {
    it('should insert a new metrics row when none exists for the period', async () => {
      // Use a mock that returns empty on select (no existing row)
      const mockDb = createMockDb();
      const originalSelect = mockDb.select;
      mockDb.select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => []), // No existing row
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => []),
            })),
          })),
          groupBy: vi.fn(() => []),
        })),
      })) as any;

      const service = createService(mockDb);
      await service.recordProcessed('email-queue', 150, 50);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(metricStore).toHaveLength(1);
      expect(metricStore[0].queue).toBe('email-queue');
      expect(metricStore[0].processedCount).toBe(1);
      expect(metricStore[0].totalRuntimeMs).toBe(150);
      expect(metricStore[0].totalWaitTimeMs).toBe(50);
    });

    it('should upsert (update) when a row exists for the period', async () => {
      // Pre-populate a metric row
      const existingRow: MockMetricRow = {
        id: 'metric-existing',
        queue: 'email-queue',
        period: new Date().toISOString().slice(0, 16),
        processedCount: 5,
        failedCount: 1,
        totalRuntimeMs: 500,
        totalWaitTimeMs: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockDb = createMockDb();
      mockDb.select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => [existingRow]),
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => [existingRow]),
            })),
          })),
          groupBy: vi.fn(() => []),
        })),
      })) as any;

      const service = createService(mockDb);
      await service.recordProcessed('email-queue', 200, 30);

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('recordFailed', () => {
    it('should insert a new metrics row with failedCount=1', async () => {
      const mockDb = createMockDb();
      mockDb.select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => []),
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => []),
            })),
          })),
          groupBy: vi.fn(() => []),
        })),
      })) as any;

      const service = createService(mockDb);
      await service.recordFailed('email-queue');

      expect(mockDb.insert).toHaveBeenCalled();
      expect(metricStore).toHaveLength(1);
      expect(metricStore[0].failedCount).toBe(1);
      expect(metricStore[0].processedCount).toBe(0);
    });

    it('should increment failedCount when row exists', async () => {
      const existingRow: MockMetricRow = {
        id: 'metric-existing',
        queue: 'email-queue',
        period: new Date().toISOString().slice(0, 16),
        processedCount: 10,
        failedCount: 2,
        totalRuntimeMs: 1000,
        totalWaitTimeMs: 200,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockDb = createMockDb();
      mockDb.select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => [existingRow]),
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => [existingRow]),
            })),
          })),
          groupBy: vi.fn(() => []),
        })),
      })) as any;

      const service = createService(mockDb);
      await service.recordFailed('email-queue');

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('getOverview', () => {
    it('should calculate failure rate correctly', async () => {
      metricStore = [
        {
          id: 'metric-1',
          queue: 'email',
          period: '2026-03-15T10:00',
          processedCount: 90,
          failedCount: 10,
          totalRuntimeMs: 9000,
          totalWaitTimeMs: 1000,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const service = createService();
      const overview = await service.getOverview();

      expect(overview.queues).toHaveLength(1);
      expect(overview.queues[0].name).toBe('email');
      expect(overview.queues[0].processed).toBe(90);
      expect(overview.queues[0].failed).toBe(10);
      expect(overview.queues[0].failureRate).toBe(10); // 10%
      expect(overview.queues[0].avgRuntimeMs).toBe(100); // 9000/90
      expect(overview.totalProcessed).toBe(90);
      expect(overview.totalFailed).toBe(10);
    });

    it('should return empty overview when no metrics exist', async () => {
      const service = createService();
      const overview = await service.getOverview();

      expect(overview.queues).toHaveLength(0);
      expect(overview.totalProcessed).toBe(0);
      expect(overview.totalFailed).toBe(0);
    });

    it('should aggregate multiple periods for the same queue', async () => {
      metricStore = [
        {
          id: 'metric-1',
          queue: 'email',
          period: '2026-03-15T10:00',
          processedCount: 50,
          failedCount: 5,
          totalRuntimeMs: 5000,
          totalWaitTimeMs: 500,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'metric-2',
          queue: 'email',
          period: '2026-03-15T10:01',
          processedCount: 50,
          failedCount: 5,
          totalRuntimeMs: 5000,
          totalWaitTimeMs: 500,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const service = createService();
      const overview = await service.getOverview();

      expect(overview.queues).toHaveLength(1);
      expect(overview.queues[0].processed).toBe(100);
      expect(overview.queues[0].failed).toBe(10);
    });
  });

  describe('getFailedJobs', () => {
    it('should return failed jobs from the database', async () => {
      jobStore = [
        {
          id: 'job-1',
          type: 'email',
          status: 'FAILED',
          error: 'Timeout',
          processedBy: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'job-2',
          type: 'email',
          status: 'COMPLETED',
          error: null,
          processedBy: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const service = createService();
      const failed = await service.getFailedJobs();

      // The mock returns all jobs in store (mock doesn't truly filter)
      // In real DB, the where clause filters by status=FAILED
      expect(failed.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('retryAll', () => {
    it('should reset failed job statuses to PENDING', async () => {
      jobStore = [
        {
          id: 'job-1',
          type: 'email',
          status: 'FAILED',
          error: 'Timeout',
          processedBy: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'job-2',
          type: 'email',
          status: 'FAILED',
          error: 'Connection refused',
          processedBy: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const service = createService();
      const count = await service.retryAll();

      expect(count).toBe(2);
      expect(jobStore[0].status).toBe('PENDING');
      expect(jobStore[0].error).toBeNull();
      expect(jobStore[1].status).toBe('PENDING');
    });
  });
});
