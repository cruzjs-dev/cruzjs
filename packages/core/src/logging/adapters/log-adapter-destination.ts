import type { LogAdapter } from '../log.adapter';
import type { LogEntry } from '../log.types';

export function dispatchToAdapters(
  adapters: LogAdapter[],
  entry: LogEntry,
): void {
  if (adapters.length === 0) return;

  for (const adapter of adapters) {
    adapter.log(entry).catch(() => {
      // Adapter failures must not crash the application
    });
  }
}
