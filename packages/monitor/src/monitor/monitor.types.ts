/**
 * Monitor entry types for the debug dashboard (Telescope).
 */

export const MonitorEntryTypeValues = [
  'request',
  'query',
  'job',
  'event',
  'mail',
  'notification',
  'cache',
  'exception',
] as const;

export type MonitorEntryType = (typeof MonitorEntryTypeValues)[number];

export const MonitorEntryStatusValues = ['pending', 'success', 'error'] as const;

export type MonitorEntryStatus = (typeof MonitorEntryStatusValues)[number];

/**
 * Shape of a monitor entry as returned from queries.
 */
export type MonitorEntryRecord = {
  id: string;
  type: MonitorEntryType;
  content: Record<string, unknown>;
  familyHash: string | null;
  batchId: string | null;
  tags: string[] | null;
  status: MonitorEntryStatus;
  duration: number | null;
  createdAt: string;
};

/**
 * Input for recording a new monitor entry.
 */
export type RecordEntryInput = {
  type: MonitorEntryType;
  content: Record<string, unknown>;
  familyHash?: string;
  batchId?: string;
  tags?: string[];
  status?: MonitorEntryStatus;
  duration?: number;
};

/**
 * Options for listing monitor entries.
 */
export type ListEntriesOptions = {
  type?: MonitorEntryType;
  status?: MonitorEntryStatus;
  tag?: string;
  limit?: number;
  before?: Date;
};

/**
 * Aggregated stats per entry type.
 */
export type MonitorStats = Record<MonitorEntryType, number>;
