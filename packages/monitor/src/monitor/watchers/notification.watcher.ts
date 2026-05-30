/**
 * Notification Watcher
 *
 * Captures notification sends for the debug dashboard.
 */

import { Injectable, Inject } from '@cruzjs/core/di';
import { MonitorService } from '../monitor.service';

@Injectable()
export class NotificationWatcher {
  constructor(@Inject(MonitorService) private readonly monitor: MonitorService) {}

  /**
   * Capture a notification send.
   */
  async capture(options: {
    channel: string;
    type: string;
    recipientId: string;
    status?: 'success' | 'error';
    error?: string;
  }): Promise<void> {
    await this.monitor.record({
      type: 'notification',
      content: {
        channel: options.channel,
        notificationType: options.type,
        recipientId: options.recipientId,
        error: options.error,
      },
      familyHash: `notification:${options.channel}:${options.type}`,
      status: options.status ?? 'success',
      tags: ['notification', options.channel, options.type],
    });
  }
}
