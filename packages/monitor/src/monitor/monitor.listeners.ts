/**
 * Monitor Event Listeners
 *
 * These listeners capture job lifecycle events and record them
 * as monitor entries via the JobWatcher.
 *
 * Note: The job events module in core currently does not export concrete
 * event classes. These listeners are designed to work with the expected
 * event shapes. Wire them up once job events are available.
 */

import { buildContainerWithProviders } from '@cruzjs/core/framework/application.server';
import type { AppEvent } from '@cruzjs/core/shared/events/event';
import { JobWatcher } from './watchers/job.watcher';

/**
 * Listener for when a job is created.
 * Expected event shape: { jobType: string; payload: unknown }
 */
export async function captureJobCreatedListener(event: AppEvent & { jobType: string; payload: unknown }): Promise<void> {
  try {
    const container = await buildContainerWithProviders([]);
    const watcher = container.resolve(JobWatcher);
    await watcher.captureCreated(event.jobType, event.payload);
  } catch {
    // Swallow errors — monitoring should never break the app
  }
}

/**
 * Listener for when a job completes.
 * Expected event shape: { jobType: string; jobId: string; durationMs: number }
 */
export async function captureJobCompletedListener(event: AppEvent & { jobType: string; jobId: string; durationMs: number }): Promise<void> {
  try {
    const container = await buildContainerWithProviders([]);
    const watcher = container.resolve(JobWatcher);
    await watcher.captureCompleted(event.jobType, event.jobId, event.durationMs);
  } catch {
    // Swallow errors — monitoring should never break the app
  }
}

/**
 * Listener for when a job fails.
 * Expected event shape: { jobType: string; jobId: string; error: string }
 */
export async function captureJobFailedListener(event: AppEvent & { jobType: string; jobId: string; error: string }): Promise<void> {
  try {
    const container = await buildContainerWithProviders([]);
    const watcher = container.resolve(JobWatcher);
    await watcher.captureFailed(event.jobType, event.jobId, event.error);
  } catch {
    // Swallow errors — monitoring should never break the app
  }
}
