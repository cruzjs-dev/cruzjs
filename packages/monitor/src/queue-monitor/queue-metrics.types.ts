/**
 * Queue Metrics Types
 *
 * Types for the queue monitoring (Horizon) feature.
 */

/**
 * Overview of all queues' health.
 */
export type QueueOverview = {
  queues: QueueSummary[];
  totalProcessed: number;
  totalFailed: number;
};

/**
 * Per-queue summary metrics.
 */
export type QueueSummary = {
  name: string;
  processed: number;
  failed: number;
  avgRuntimeMs: number;
  failureRate: number;
};

/**
 * Shape of a queue metrics row after deserialization.
 */
export type QueueMetricRecord = {
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

/**
 * Options for listing recent jobs.
 */
export type RecentJobsOptions = {
  limit?: number;
  status?: string;
  queue?: string;
};

/**
 * Options for listing failed jobs.
 */
export type FailedJobsOptions = {
  limit?: number;
  queue?: string;
};
