/**
 * Job registry is no longer needed.
 * Use JobHandlerRegistry from './job-handler.registry' instead.
 *
 * Job handlers are registered via IoC container in job.container.ts
 * using the JOB_HANDLER symbol for multi-injection.
 *
 * @see JobHandlerRegistry
 * @see JOB_HANDLER
 */
export { JobHandlerRegistry, JOB_HANDLER } from './job-handler.registry';
