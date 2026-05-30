/**
 * Jobs System Unit Tests
 *
 * Tests for JobHandlerRegistry (handler registration, lookup, query criteria)
 * and QueueFake (dispatch recording and assertions).
 *
 * The JobService itself requires a real D1 database and CloudflareContext so we
 * test the registry and fake layers which are the unit-testable surfaces.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JobHandlerRegistry } from '../job-handler.registry';
import { createQueueFake } from '../../testing/queue-fake';
import type { JobHandler, JobResult } from '../job.types';
import { JobPriority } from '../job.types';

// ─── Test Helpers ─────────────────────────────────────────────────────────────

function createTestHandler(
  jobType: string,
  runFn?: (job: unknown) => Promise<JobResult>,
): JobHandler {
  return {
    metadata: { jobType, description: `Handler for ${jobType}` },
    run: runFn ?? (async () => ({ success: true })),
  };
}

// ─── JobHandlerRegistry ───────────────────────────────────────────────────────

describe('JobHandlerRegistry', () => {
  let registry: JobHandlerRegistry;

  beforeEach(() => {
    registry = new JobHandlerRegistry([]);
  });

  it('registers a handler and retrieves it by job type', () => {
    const handler = createTestHandler('SEND_EMAIL');
    registry.register(handler);

    expect(registry.getHandler('SEND_EMAIL')).toBe(handler);
    expect(registry.hasHandler('SEND_EMAIL')).toBe(true);
  });

  it('returns null for unregistered job type', () => {
    expect(registry.getHandler('NONEXISTENT')).toBeNull();
    expect(registry.hasHandler('NONEXISTENT')).toBe(false);
  });

  it('returns all registered job types', () => {
    registry.register(createTestHandler('SEND_EMAIL'));
    registry.register(createTestHandler('DELETE_ACCOUNT'));
    registry.register(createTestHandler('PROCESS_PAYMENT'));

    const types = registry.getRegisteredTypes();
    expect(types).toContain('SEND_EMAIL');
    expect(types).toContain('DELETE_ACCOUNT');
    expect(types).toContain('PROCESS_PAYMENT');
    expect(types).toHaveLength(3);
  });

  it('overwrites handler when same job type is registered twice', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const handler1 = createTestHandler('SEND_EMAIL');
    const handler2 = createTestHandler('SEND_EMAIL');

    registry.register(handler1);
    registry.register(handler2);

    expect(registry.getHandler('SEND_EMAIL')).toBe(handler2);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Overwriting handler for job type: SEND_EMAIL'),
    );

    warnSpy.mockRestore();
  });

  it('getHandlers returns all registered handlers', () => {
    const handler1 = createTestHandler('JOB_A');
    const handler2 = createTestHandler('JOB_B');

    registry.register(handler1);
    registry.register(handler2);

    const handlers = registry.getHandlers();
    expect(handlers).toHaveLength(2);
    expect(handlers).toContain(handler1);
    expect(handlers).toContain(handler2);
  });

  it('getQueryCriteria returns union of all job types and statuses', () => {
    const handler1: JobHandler = {
      metadata: { jobType: 'SEND_EMAIL', statuses: ['PENDING'] },
      run: async () => ({ success: true }),
    };
    const handler2: JobHandler = {
      metadata: { jobType: 'RETRY_PAYMENT', statuses: ['FAILED'] },
      run: async () => ({ success: true }),
    };

    registry.register(handler1);
    registry.register(handler2);

    const criteria = registry.getQueryCriteria();
    expect(criteria.jobTypes).toContain('SEND_EMAIL');
    expect(criteria.jobTypes).toContain('RETRY_PAYMENT');
    expect(criteria.statuses).toContain('PENDING');
    expect(criteria.statuses).toContain('FAILED');
  });

  it('getQueryCriteria defaults to PENDING when handler has no statuses', () => {
    const handler: JobHandler = {
      metadata: { jobType: 'SIMPLE_JOB' },
      run: async () => ({ success: true }),
    };

    registry.register(handler);

    const criteria = registry.getQueryCriteria();
    expect(criteria.statuses).toContain('PENDING');
  });

  it('getHandlersForStatus filters by status', () => {
    const pendingHandler: JobHandler = {
      metadata: { jobType: 'JOB_A', statuses: ['PENDING'] },
      run: async () => ({ success: true }),
    };
    const failedHandler: JobHandler = {
      metadata: { jobType: 'JOB_B', statuses: ['FAILED'] },
      run: async () => ({ success: true }),
    };
    const bothHandler: JobHandler = {
      metadata: { jobType: 'JOB_C', statuses: ['PENDING', 'FAILED'] },
      run: async () => ({ success: true }),
    };

    registry.register(pendingHandler);
    registry.register(failedHandler);
    registry.register(bothHandler);

    const pendingHandlers = registry.getHandlersForStatus('PENDING');
    expect(pendingHandlers).toContain(pendingHandler);
    expect(pendingHandlers).toContain(bothHandler);
    expect(pendingHandlers).not.toContain(failedHandler);

    const failedHandlers = registry.getHandlersForStatus('FAILED');
    expect(failedHandlers).toContain(failedHandler);
    expect(failedHandlers).toContain(bothHandler);
    expect(failedHandlers).not.toContain(pendingHandler);
  });

  it('handler run function is callable and returns result', async () => {
    const handler = createTestHandler('TEST_JOB', async () => ({
      success: true,
      summary: { processed: 42 },
    }));

    registry.register(handler);

    const retrieved = registry.getHandler('TEST_JOB')!;
    const result = await retrieved.run({} as never);

    expect(result.success).toBe(true);
    expect(result.summary).toEqual({ processed: 42 });
  });

  it('accepts handlers through constructor injection', () => {
    const handlers = [
      createTestHandler('JOB_A'),
      createTestHandler('JOB_B'),
    ];

    const registryWithHandlers = new JobHandlerRegistry(handlers);

    expect(registryWithHandlers.hasHandler('JOB_A')).toBe(true);
    expect(registryWithHandlers.hasHandler('JOB_B')).toBe(true);
    expect(registryWithHandlers.getRegisteredTypes()).toHaveLength(2);
  });
});

// ─── QueueFake ────────────────────────────────────────────────────────────────

describe('QueueFake', () => {
  let queue: ReturnType<typeof createQueueFake>;

  beforeEach(() => {
    queue = createQueueFake();
  });

  it('assertNotDispatched passes before any dispatch', () => {
    queue.assertNotDispatched('SendWelcomeEmail');
  });

  it('assertDispatched passes after dispatch', () => {
    queue.record('SendWelcomeEmail', { userId: '123' });
    queue.assertDispatched('SendWelcomeEmail');
  });

  it('serializes and records payload correctly', () => {
    const payload = { userId: '123', data: { nested: true } };
    queue.record('ProcessData', payload);

    const dispatched = queue.getDispatched();
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].jobClass).toBe('ProcessData');
    expect(dispatched[0].payload).toEqual(payload);
  });

  it('assertNotDispatched throws after dispatch', () => {
    queue.record('MyJob', {});

    expect(() => queue.assertNotDispatched('MyJob')).toThrow(
      'Expected job "MyJob" NOT to be dispatched',
    );
  });

  it('assertDispatched throws when job was not dispatched', () => {
    expect(() => queue.assertDispatched('MissingJob')).toThrow(
      'Expected job "MissingJob" to be dispatched',
    );
  });

  it('assertCount tracks correct number of dispatched jobs', () => {
    queue.record('Job1', {});
    queue.record('Job2', {});
    queue.record('Job3', {});

    queue.assertCount(3);
  });

  it('clear resets the dispatched list', () => {
    queue.record('Job1', {});
    queue.record('Job2', {});
    queue.assertCount(2);

    queue.clear();
    queue.assertCount(0);
    queue.assertNotDispatched();
  });
});

// ─── JobPriority Constants ────────────────────────────────────────────────────

describe('JobPriority', () => {
  it('defines expected priority levels', () => {
    expect(JobPriority.CRITICAL).toBe(100);
    expect(JobPriority.HIGH).toBe(75);
    expect(JobPriority.NORMAL).toBe(50);
    expect(JobPriority.LOW).toBe(25);
    expect(JobPriority.BACKGROUND).toBe(0);
  });

  it('CRITICAL > HIGH > NORMAL > LOW > BACKGROUND', () => {
    expect(JobPriority.CRITICAL).toBeGreaterThan(JobPriority.HIGH);
    expect(JobPriority.HIGH).toBeGreaterThan(JobPriority.NORMAL);
    expect(JobPriority.NORMAL).toBeGreaterThan(JobPriority.LOW);
    expect(JobPriority.LOW).toBeGreaterThan(JobPriority.BACKGROUND);
  });
});
