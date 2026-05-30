import type { Job, JobStatus } from '../database/schema';

/**
 * Result of a job execution
 */
export type JobResult = {
  success: boolean;
  summary?: Record<string, unknown>;
  error?: string;
};

/**
 * Job handler metadata - defines what jobs a handler can process
 */
export type JobHandlerMetadata = {
  /** Unique identifier for the job type this handler processes */
  jobType: string;
  /** Which statuses this handler will process (default: ['PENDING']) */
  statuses?: JobStatus[];
  /** Description for logging/debugging */
  description?: string;
};

/**
 * Job handler interface - implement this to create a job processor
 */
export type JobHandler = {
  /** Metadata defining what jobs this handler processes */
  readonly metadata: JobHandlerMetadata;
  /** Execute the job */
  run(job: Job): Promise<JobResult>;
};

/**
 * Job query criteria derived from handler metadata
 */
export type JobQueryCriteria = {
  jobTypes: string[];
  statuses: JobStatus[];
};

/**
 * Priority levels for jobs
 */
export const JobPriority = {
  CRITICAL: 100,
  HIGH: 75,
  NORMAL: 50,
  LOW: 25,
  BACKGROUND: 0,
} as const;

export type JobPriorityLevel = keyof typeof JobPriority;

export const SEND_EMAIL_JOB_TYPE = 'SEND_EMAIL';
export const DELETE_ACCOUNT_JOB_TYPE = 'DELETE_ACCOUNT';

export interface DeleteAccountJobPayload {
  userId: string;
  email: string;
}

export interface SendEmailJobPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  template?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Input for creating a new job
 */
export type CreateJobInput = {
  type: string;
  payload: Record<string, unknown>;
  lookupKey?: string;
  scheduledFor?: Date;
  priority?: number | JobPriorityLevel;
  maxAttempts?: number;
};

/**
 * Job update input for modifying job state
 */
export type UpdateJobInput = {
  status?: JobStatus;
  resultSummary?: Record<string, unknown>;
  error?: string;
  processedBy?: string | null;
  startedAt?: Date;
  completedAt?: Date;
};

/**
 * Query options for finding jobs
 */
export type FindJobsOptions = {
  types?: string[];
  statuses?: JobStatus[];
  lookupKey?: string;
  limit?: number;
  orderByPriority?: boolean;
};

