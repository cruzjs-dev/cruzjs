/**
 * Queue Metrics Event Listeners
 *
 * These listeners track job completion and failure for queue metrics.
 * They are designed to integrate with job lifecycle events once
 * those event classes are exported from @cruzjs/core.
 */

import { buildContainerWithProviders } from '@cruzjs/core/framework/application.server';
import type { AppEvent } from '@cruzjs/core/shared/events/event';
import { QueueMetricsService } from './queue-metrics.service';

/**
 * Record a metric when a job completes.
 * Expected event shape: { jobType: string; durationMs: number; waitTimeMs?: number }
 */
export async function recordJobCompletedMetric(event: AppEvent & { jobType: string; durationMs: number; waitTimeMs?: number }): Promise<void> {
  try {
    const container = await buildContainerWithProviders([]);
    const service = container.resolve(QueueMetricsService);
    await service.recordProcessed(event.jobType, event.durationMs, event.waitTimeMs);
  } catch {
    // Swallow errors — metrics should never break the app
  }
}

/**
 * Record a metric when a job fails.
 * Expected event shape: { jobType: string }
 */
export async function recordJobFailedMetric(event: AppEvent & { jobType: string }): Promise<void> {
  try {
    const container = await buildContainerWithProviders([]);
    const service = container.resolve(QueueMetricsService);
    await service.recordFailed(event.jobType);
  } catch {
    // Swallow errors — metrics should never break the app
  }
}
