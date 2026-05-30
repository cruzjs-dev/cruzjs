import { injectable } from 'inversify';
import type { Job } from '@cruzjs/core/database/schema';
import type { JobHandler, JobHandlerMetadata, JobResult } from '@cruzjs/core/jobs/job.types';

type HelloWorldPayload = {
  name: string;
};

/**
 * Example job handler that logs a greeting.
 * Demonstrates the queue-based job pattern.
 */
@injectable()
export class HelloWorldJobHandler implements JobHandler {
  readonly metadata: JobHandlerMetadata = {
    jobType: 'hello-world',
    description: 'Logs a greeting (example handler)',
  };

  async run(job: Job): Promise<JobResult> {
    const payload = job.payload as unknown as HelloWorldPayload;
    const name = payload.name || 'World';

    console.log(`[HelloWorld] Hello, ${name}! (job ${job.id})`);

    // Simulate some async work
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      success: true,
      summary: {
        greeting: `Hello, ${name}!`,
        processedAt: new Date().toISOString(),
      },
    };
  }
}
