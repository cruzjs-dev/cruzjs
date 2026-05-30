/**
 * Queue Fake
 *
 * In-memory fake for the job/queue system. Records dispatched jobs
 * and provides assertion helpers to verify expected side effects in tests.
 *
 * @example
 * ```typescript
 * import { createQueueFake } from '@cruzjs/core/testing';
 *
 * const queue = createQueueFake();
 * // Rebind the job service in the DI container to use the fake
 * queue.record('SendWelcomeEmail', { userId: '123' });
 *
 * queue.assertDispatched('SendWelcomeEmail');
 * queue.assertNotDispatched('DeleteAccount');
 * ```
 */

export type DispatchedJob = {
  jobClass: string;
  payload: unknown;
};

export type QueueFake = {
  readonly dispatched: DispatchedJob[];
  record(jobClass: string, payload: unknown): void;
  assertDispatched(jobClass: string): void;
  assertNotDispatched(jobClass?: string): void;
  getDispatched(): DispatchedJob[];
  assertCount(n: number): void;
  clear(): void;
};

/**
 * Create an in-memory fake for the queue/job system.
 * Use in unit tests to assert jobs were dispatched without actually processing them.
 *
 * @example
 * ```typescript
 * const queue = createQueueFake();
 * container.rebind(JobService).toConstantValue(queue);
 * await service.createUser(data);
 * queue.assertDispatched('SendWelcomeEmail');
 * ```
 */
export function createQueueFake(): QueueFake {
  const dispatched: DispatchedJob[] = [];

  return {
    get dispatched() {
      return dispatched;
    },

    record(jobClass: string, payload: unknown): void {
      dispatched.push({ jobClass, payload });
    },

    assertDispatched(jobClass: string): void {
      const match = dispatched.find((j) => j.jobClass === jobClass);
      if (!match) {
        throw new Error(
          `Expected job "${jobClass}" to be dispatched, but it was not. ` +
            `Dispatched: [${dispatched.map((j) => j.jobClass).join(', ')}]`,
        );
      }
    },

    assertNotDispatched(jobClass?: string): void {
      if (jobClass) {
        const match = dispatched.find((j) => j.jobClass === jobClass);
        if (match) {
          throw new Error(
            `Expected job "${jobClass}" NOT to be dispatched, but it was.`,
          );
        }
      } else if (dispatched.length > 0) {
        throw new Error(
          `Expected no jobs to be dispatched, but ${dispatched.length} were. ` +
            `Dispatched: [${dispatched.map((j) => j.jobClass).join(', ')}]`,
        );
      }
    },

    getDispatched(): DispatchedJob[] {
      return [...dispatched];
    },

    assertCount(n: number): void {
      if (dispatched.length !== n) {
        throw new Error(
          `Expected ${n} job(s) to be dispatched, but ${dispatched.length} were.`,
        );
      }
    },

    clear(): void {
      dispatched.length = 0;
    },
  };
}
