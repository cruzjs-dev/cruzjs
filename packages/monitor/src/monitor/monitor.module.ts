/**
 * Monitor Module (Inspector)
 *
 * Opt-in module for the debug dashboard. Records requests, queries,
 * jobs, events, mail, notifications, cache ops, and exceptions.
 *
 * Usage:
 * ```typescript
 * import { MonitorModule } from '@cruzjs/monitor/monitor';
 *
 * export default createCruzApp({
 *   schema,
 *   modules: [StartModule, MonitorModule],
 *   pages: () => import('virtual:react-router/server-build'),
 * });
 * ```
 */

import { Module } from '@cruzjs/core/di';
import { MonitorService } from './monitor.service';
import { MonitorTrpc } from './monitor.trpc';
import {
  RequestWatcher,
  QueryWatcher,
  JobWatcher,
  EventWatcher,
  MailWatcher,
  NotificationWatcher,
  CacheWatcher,
  ExceptionWatcher,
} from './watchers';

@Module({
  providers: [
    MonitorService,
    MonitorTrpc,
    RequestWatcher,
    QueryWatcher,
    JobWatcher,
    EventWatcher,
    MailWatcher,
    NotificationWatcher,
    CacheWatcher,
    ExceptionWatcher,
  ],
  trpcRouters: {
    monitor: MonitorTrpc,
  },
})
export class MonitorModule {}
