/**
 * Task Scheduler Types
 *
 * Core types for the CruzJS task scheduler system.
 */

export type TaskRunStatus = 'completed' | 'failed' | 'skipped';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export type ScheduledTaskConfig = {
  name: string;
  description?: string;
  cron: string;
  handler: () => Promise<void>;
  timezone?: string;
  withoutOverlapping?: boolean;
  onSuccess?: (durationMs: number) => void | Promise<void>;
  onFailure?: (error: Error) => void | Promise<void>;
};

export type TaskRunResult = {
  name: string;
  status: TaskRunStatus;
  durationMs: number;
  error?: string;
};

export type ScheduledTaskInfo = {
  id: string;
  name: string;
  description: string | null;
  cronExpression: string;
  isActive: boolean;
  lastRunAt: Date | null;
  lastRunStatus: TaskRunStatus | null;
  lastRunDurationMs: number | null;
  nextRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TaskRunInfo = {
  id: string;
  taskName: string;
  status: TaskRunStatus;
  startedAt: Date;
  completedAt: Date | null;
  durationMs: number | null;
  output: string | null;
  error: string | null;
  createdAt: Date;
};
