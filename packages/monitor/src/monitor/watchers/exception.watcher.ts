/**
 * Exception Watcher
 *
 * Captures uncaught exceptions and errors for the debug dashboard.
 */

import { Injectable, Inject } from '@cruzjs/core/di';
import { MonitorService } from '../monitor.service';

@Injectable()
export class ExceptionWatcher {
  constructor(@Inject(MonitorService) private readonly monitor: MonitorService) {}

  /**
   * Capture an exception.
   */
  async capture(error: unknown, context?: Record<string, unknown>): Promise<void> {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    await this.monitor.record({
      type: 'exception',
      content: {
        class: errorObj.constructor.name,
        message: errorObj.message,
        stack: errorObj.stack,
        ...context,
      },
      familyHash: `exception:${errorObj.constructor.name}:${errorObj.message}`,
      status: 'error',
      tags: ['exception', errorObj.constructor.name],
    });
  }
}
