/**
 * Event Watcher
 *
 * Captures domain event dispatches for the debug dashboard.
 */

import { Injectable, Inject } from '@cruzjs/core/di';
import { MonitorService } from '../monitor.service';

@Injectable()
export class EventWatcher {
  constructor(@Inject(MonitorService) private readonly monitor: MonitorService) {}

  /**
   * Capture a domain event dispatch.
   */
  async capture(eventName: string, payload: unknown): Promise<void> {
    await this.monitor.record({
      type: 'event',
      content: {
        eventName,
        payload,
      },
      familyHash: `event:${eventName}`,
      status: 'success',
      tags: ['event', eventName],
    });
  }
}
