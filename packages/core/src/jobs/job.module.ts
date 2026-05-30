/**
 * Job Module
 *
 * Queue-based background job processing.
 *
 * Architecture:
 * - JobService: CRUD operations + queue dispatch on creation
 * - JobHandlerRegistry: Collects all registered handlers via multi-injection
 * - QueueService: Sends messages to Cloudflare Queues (or LocalQueue facade)
 * - handleJobMessage: Queue consumer logic (used by CF Workers + local facade)
 * - JOB_HANDLER: Symbol for multi-injecting job handlers
 *
 * Flow: JobService.createJob() → D1 insert + Queue message → Consumer → Handler
 *
 * In local dev, CloudflareContext provides a LocalQueue facade that processes
 * messages in-process via setImmediate. The local consumer is registered
 * automatically when a LocalQueue is detected for JOBS_QUEUE.
 */

import { Module } from '../di';
import { JobService } from './job.service';
import { ScheduledJobsService } from './scheduled-jobs.service';
import { JobHandlerRegistry, JOB_HANDLER } from './job-handler.registry';
import { QueueService } from '../queues/queue.service';
import { SendEmailJobHandler } from './handlers/send-email.handler';
import { EventListenerJobHandler } from './handlers/event-listener.handler';
import { DeleteAccountJobHandler } from './handlers/delete-account.handler';
import { jobTrpc } from './job.trpc';

@Module({
  providers: [
    // Core services
    JobService,
    ScheduledJobsService,
    JobHandlerRegistry,
    QueueService,

    // Job handlers - bound BEFORE registry so they can be collected
    { provide: JOB_HANDLER, useClass: SendEmailJobHandler, multi: true },
    { provide: JOB_HANDLER, useClass: EventListenerJobHandler, multi: true },
    { provide: JOB_HANDLER, useClass: DeleteAccountJobHandler, multi: true },
  ],
  trpcRouters: {
    job: jobTrpc,
  },
})
export class JobModule {}

// Re-export for convenience
export { JOB_HANDLER };
