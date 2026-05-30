/**
 * Cache Watcher
 *
 * Captures cache operations (get/set/delete) for the debug dashboard.
 */

import { Injectable, Inject } from '@cruzjs/core/di';
import { MonitorService } from '../monitor.service';

@Injectable()
export class CacheWatcher {
  constructor(@Inject(MonitorService) private readonly monitor: MonitorService) {}

  /**
   * Capture a cache operation.
   */
  async capture(options: {
    operation: 'get' | 'set' | 'delete' | 'has';
    key: string;
    hit?: boolean;
    durationMs?: number;
  }): Promise<void> {
    const tags = ['cache', options.operation];
    if (options.operation === 'get') {
      tags.push(options.hit ? 'hit' : 'miss');
    }

    await this.monitor.record({
      type: 'cache',
      content: {
        operation: options.operation,
        key: options.key,
        hit: options.hit,
      },
      familyHash: `cache:${options.operation}`,
      status: 'success',
      duration: options.durationMs ? Math.round(options.durationMs) : undefined,
      tags,
    });
  }
}
