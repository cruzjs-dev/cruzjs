/**
 * Generic message types for Cloudflare Queues.
 *
 * App-specific message types should be defined in the app, not here.
 */

/**
 * Generic queue message wrapper.
 * Apps should define their own message types and use this as a base.
 */
export type QueueMessage<T = unknown> = {
  type: string;
  payload: T;
  timestamp: string;
};

/**
 * Queue binding name for the built-in jobs queue.
 */
export const JOBS_QUEUE_BINDING = 'JOBS_QUEUE';

/**
 * Message sent to the jobs queue when a job is created.
 * Intentionally lightweight — the consumer fetches the full job from D1.
 */
export type JobQueueMessage = {
  jobId: string;
  type: string;
  priority: number;
  attempt: number;
};
