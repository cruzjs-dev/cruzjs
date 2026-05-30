/**
 * Job Watcher
 *
 * Captures job lifecycle events for the debug dashboard.
 */

import { Injectable, Inject } from '@cruzjs/core/di';
import { MonitorService } from '../monitor.service';

@Injectable()
export class JobWatcher {
  constructor(@Inject(MonitorService) private readonly monitor: MonitorService) {}

  /**
   * Capture when a job is created/dispatched.
   */
  async captureCreated(jobType: string, payload: unknown): Promise<void> {
    await this.monitor.record({
      type: 'job',
      content: {
        jobType,
        payload,
        lifecycle: 'created',
      },
      familyHash: `job:${jobType}`,
      status: 'pending',
      tags: ['job', jobType, 'created'],
    });
  }

  /**
   * Capture when a job completes successfully.
   */
  async captureCompleted(jobType: string, jobId: string, durationMs: number): Promise<void> {
    await this.monitor.record({
      type: 'job',
      content: {
        jobType,
        jobId,
        lifecycle: 'completed',
      },
      familyHash: `job:${jobType}`,
      status: 'success',
      duration: Math.round(durationMs),
      tags: ['job', jobType, 'completed'],
    });
  }

  /**
   * Capture when a job fails.
   */
  async captureFailed(jobType: string, jobId: string, error: string): Promise<void> {
    await this.monitor.record({
      type: 'job',
      content: {
        jobType,
        jobId,
        lifecycle: 'failed',
        error,
      },
      familyHash: `job:${jobType}`,
      status: 'error',
      tags: ['job', jobType, 'failed'],
    });
  }
}
