/**
 * Local Queue Consumer Registry
 *
 * Registers local queue consumers for development.
 * The built-in JOBS_QUEUE consumer is always registered.
 * User-defined queue consumers are registered via setLocalQueueHandlers().
 *
 * Called by buildContainerWithProviders() on every container build
 * to survive Vite HMR module invalidation.
 */

import type { CruzContainer } from '../di';
import { CloudflareContext } from '../shared/cloudflare/context';
import { JOBS_QUEUE_BINDING } from '../queues/queue.types';
import type { JobQueueMessage } from '../queues/queue.types';
import { handleJobMessage } from '../jobs/job-queue.consumer';
import type { LocalQueue } from '../shared/cloudflare/local-queue';

/**
 * Handler for a batch of queue messages.
 */
export type QueueHandler<T = unknown> = (
  messages: T[],
  container: CruzContainer,
) => Promise<void>;

/**
 * User-defined queue handlers, set by createCruzApp() or setLocalQueueHandlers().
 */
let userQueueHandlers: Record<string, QueueHandler> = {};

/**
 * Register user-defined queue handlers for local development.
 * Call from app.server.ts or createCruzApp().
 */
export function setLocalQueueHandlers(handlers: Record<string, QueueHandler>): void {
  userQueueHandlers = handlers;
}

/**
 * Register local queue consumers for development.
 * Called from buildContainerWithProviders() on every container build.
 * Idempotent — safe to call multiple times (just replaces the callback).
 *
 * In production (real CF bindings), getLocalQueue() returns null so this is a no-op.
 */
export function registerLocalQueueConsumers(container: CruzContainer): void {
  // Built-in jobs queue — always register consumer
  CloudflareContext.getQueue<JobQueueMessage>(JOBS_QUEUE_BINDING);
  const localJobsQueue = CloudflareContext.getLocalQueue<JobQueueMessage>(JOBS_QUEUE_BINDING);
  if (localJobsQueue) {
    localJobsQueue.onMessage(async (message) => {
      await handleJobMessage(message, container);
    });
  }

  // User-defined queues
  for (const [bindingName, handler] of Object.entries(userQueueHandlers)) {
    CloudflareContext.getQueue(bindingName);
    const localQueue = CloudflareContext.getLocalQueue(bindingName);
    if (localQueue) {
      (localQueue as LocalQueue<unknown>).onMessage(async (message) => {
        await handler([message], container);
      });
    }
  }
}
