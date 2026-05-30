import { Injectable, MultiInject, Optional, createToken } from '../di';
import type { JobHandler, JobQueryCriteria } from './job.types';
import type { JobStatus } from '../database/schema';

/**
 * Injection token for multi-injection of job handlers (interface, not a class)
 */
export const JOB_HANDLER = createToken<JobHandler>('JobHandler');

/**
 * Registry that collects all job handlers and provides query optimization
 */
@Injectable()
export class JobHandlerRegistry {
  private handlerMap: Map<string, JobHandler> = new Map();

  constructor(
    @MultiInject(JOB_HANDLER)
    @Optional()
    handlers: JobHandler[] = []
  ) {
    for (const handler of handlers) {
      this.register(handler);
    }
  }

  /**
   * Register a job handler
   */
  register(handler: JobHandler): void {
    const { jobType } = handler.metadata;
    if (this.handlerMap.has(jobType)) {
      console.warn(`[JobHandlerRegistry] Overwriting handler for job type: ${jobType}`);
    }
    this.handlerMap.set(jobType, handler);
  }

  /**
   * Get handler for a specific job type
   */
  getHandler(jobType: string): JobHandler | null {
    return this.handlerMap.get(jobType) ?? null;
  }

  /**
   * Check if a handler exists for the job type
   */
  hasHandler(jobType: string): boolean {
    return this.handlerMap.has(jobType);
  }

  /**
   * Get all registered job types
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.handlerMap.keys());
  }

  /**
   * Get all registered handlers
   */
  getHandlers(): JobHandler[] {
    return Array.from(this.handlerMap.values());
  }

  /**
   * Build optimized query criteria from all registered handlers
   * Returns the union of all job types and statuses that handlers can process
   */
  getQueryCriteria(): JobQueryCriteria {
    const jobTypes: Set<string> = new Set();
    const statuses: Set<JobStatus> = new Set();

    for (const handler of this.handlerMap.values()) {
      jobTypes.add(handler.metadata.jobType);
      const handlerStatuses = handler.metadata.statuses ?? ['PENDING'];
      for (const status of handlerStatuses) {
        statuses.add(status);
      }
    }

    return {
      jobTypes: Array.from(jobTypes),
      statuses: Array.from(statuses),
    };
  }

  /**
   * Get handlers that can process a specific status
   */
  getHandlersForStatus(status: JobStatus): JobHandler[] {
    return Array.from(this.handlerMap.values()).filter((handler) => {
      const handlerStatuses = handler.metadata.statuses ?? ['PENDING'];
      return handlerStatuses.includes(status);
    });
  }
}

