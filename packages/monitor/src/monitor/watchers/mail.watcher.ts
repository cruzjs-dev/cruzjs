/**
 * Mail Watcher
 *
 * Captures email send operations for the debug dashboard.
 */

import { Injectable, Inject } from '@cruzjs/core/di';
import { MonitorService } from '../monitor.service';

@Injectable()
export class MailWatcher {
  constructor(@Inject(MonitorService) private readonly monitor: MonitorService) {}

  /**
   * Capture an email send operation.
   */
  async capture(options: {
    to: string;
    subject: string;
    status: 'success' | 'error';
    error?: string;
    durationMs?: number;
  }): Promise<void> {
    await this.monitor.record({
      type: 'mail',
      content: {
        to: options.to,
        subject: options.subject,
        error: options.error,
      },
      familyHash: `mail:${options.subject}`,
      status: options.status,
      duration: options.durationMs ? Math.round(options.durationMs) : undefined,
      tags: ['mail', options.status],
    });
  }
}
