/**
 * TEMPLATE: Job Handler
 *
 * Copy this file to create a new job handler.
 *
 * Steps:
 * 1. Copy this file and rename to your-job-name.handler.ts
 * 2. Update the class name, job type, and payload type
 * 3. Implement the run() method
 * 4. Add to JobContainer in job.container.ts:
 *    options.bind<YourJobHandler>(JOB_HANDLER).to(YourJobHandler).inSingletonScope();
 */

import type { Job } from '../../database/schema';
import type { JobHandler, JobHandlerMetadata, JobResult } from '../job.types';
import { inject, injectable } from 'inversify';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '../../shared/database/drizzle.service';

/**
 * Payload type for this job
 */
type TemplateJobPayload = {
  // Define your payload fields here
  someField: string;
  optionalField?: number;
};

/**
 * Template job handler
 * Replace with your actual job handler implementation
 */
@injectable()
export class TemplateJobHandler implements JobHandler {
  readonly metadata: JobHandlerMetadata = {
    jobType: 'template-job', // Change to your job type
    statuses: ['PENDING'], // Usually just PENDING, but can handle other statuses
    description: 'Template job handler - replace with your description',
  };

  constructor(
    // Inject your dependencies here
    @inject(DRIZZLE) private readonly db: DrizzleDatabase
  ) {}

  async run(job: Job): Promise<JobResult> {
    const payload = job.payload as unknown as TemplateJobPayload;

    // Validate payload
    if (!payload.someField) {
      return {
        success: false,
        error: 'Missing required field: someField',
      };
    }

    try {
      // Implement your job logic here
      // You can use job.lookupKey to correlate with other entities

      console.log(`Processing job ${job.id} with payload:`, payload);

      // Return success with optional summary data
      return {
        success: true,
        summary: {
          processedAt: new Date().toISOString(),
          // Add any relevant result data
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

