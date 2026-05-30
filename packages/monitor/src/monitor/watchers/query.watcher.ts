/**
 * Query Watcher
 *
 * Captures database query details for the debug dashboard.
 */

import { Injectable, Inject } from '@cruzjs/core/di';
import { MonitorService } from '../monitor.service';

@Injectable()
export class QueryWatcher {
  constructor(@Inject(MonitorService) private readonly monitor: MonitorService) {}

  /**
   * Capture a database query execution.
   */
  async capture(sqlQuery: string, bindings: unknown[], durationMs: number): Promise<void> {
    // Create a family hash from the query template (without parameter values)
    const familyHash = sqlQuery.replace(/\?/g, '?').trim();

    await this.monitor.record({
      type: 'query',
      content: {
        sql: sqlQuery,
        bindings,
        bindingCount: bindings.length,
      },
      familyHash,
      status: 'success',
      duration: Math.round(durationMs),
      tags: ['database', this.detectQueryType(sqlQuery)],
    });
  }

  /**
   * Capture a failed database query.
   */
  async captureFailed(sqlQuery: string, bindings: unknown[], error: string, durationMs: number): Promise<void> {
    await this.monitor.record({
      type: 'query',
      content: {
        sql: sqlQuery,
        bindings,
        bindingCount: bindings.length,
        error,
      },
      familyHash: sqlQuery.replace(/\?/g, '?').trim(),
      status: 'error',
      duration: Math.round(durationMs),
      tags: ['database', 'error'],
    });
  }

  private detectQueryType(sqlQuery: string): string {
    const trimmed = sqlQuery.trimStart().toLowerCase();
    if (trimmed.startsWith('select')) return 'select';
    if (trimmed.startsWith('insert')) return 'insert';
    if (trimmed.startsWith('update')) return 'update';
    if (trimmed.startsWith('delete')) return 'delete';
    return 'other';
  }
}
