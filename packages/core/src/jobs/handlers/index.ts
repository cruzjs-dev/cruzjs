/**
 * Job handlers are registered via IoC container in job.container.ts
 *
 * To create a new job handler:
 * 1. Create a handler class implementing JobHandler interface
 * 2. Add @injectable() decorator
 * 3. Define metadata with jobType and statuses
 * 4. Inject any dependencies via constructor
 * 5. Bind to JOB_HANDLER symbol in JobContainer
 *
 * Example:
 * ```typescript
 * @injectable()
 * export class MyJobHandler implements JobHandler {
 *   readonly metadata: JobHandlerMetadata = {
 *     jobType: 'my-job',
 *     statuses: ['PENDING'],
 *     description: 'Processes my jobs',
 *   };
 *
 *   constructor(@inject(MyService) private myService: MyService) {}
 *
 *   async run(job: Job): Promise<JobResult> {
 *     // Process job
 *     return { success: true, summary: { ... } };
 *   }
 * }
 * ```
 */

// Export handlers for direct import if needed
export { SendEmailJobHandler } from './send-email.handler';
export { EventListenerJobHandler } from './event-listener.handler';
export { DeleteAccountJobHandler } from './delete-account.handler';
