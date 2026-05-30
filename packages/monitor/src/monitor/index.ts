/**
 * @cruzjs/monitor — Inspector (Debug Dashboard)
 *
 * Barrel export for the debug dashboard module.
 */

// Module
export { MonitorModule } from './monitor.module';

// Service
export { MonitorService } from './monitor.service';

// tRPC Router
export { MonitorTrpc } from './monitor.trpc';

// Schema
export { monitorEntries } from './monitor.schema';
export type { MonitorEntry, NewMonitorEntry } from './monitor.schema';

// Types
export type {
  MonitorEntryType,
  MonitorEntryStatus,
  MonitorEntryRecord,
  RecordEntryInput,
  ListEntriesOptions,
  MonitorStats,
} from './monitor.types';
export { MonitorEntryTypeValues, MonitorEntryStatusValues } from './monitor.types';

// Validation
export { listEntriesSchema, getEntrySchema, clearEntriesSchema } from './monitor.validation';
export type { ListEntriesInput, GetEntryInput, ClearEntriesInput } from './monitor.validation';

// Watchers
export {
  RequestWatcher,
  QueryWatcher,
  JobWatcher,
  EventWatcher,
  MailWatcher,
  NotificationWatcher,
  CacheWatcher,
  ExceptionWatcher,
} from './watchers';

// Event Listeners
export {
  captureJobCreatedListener,
  captureJobCompletedListener,
  captureJobFailedListener,
} from './monitor.listeners';
