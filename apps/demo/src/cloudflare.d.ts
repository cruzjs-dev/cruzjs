/**
 * Cloudflare Workers Type Declarations
 *
 * These declarations extend the @cloudflare/workers-types to include
 * the Workflows API which may not be fully typed in older versions.
 */

// React Router virtual module for server build
declare module 'virtual:react-router/server-build' {
  import type { ServerBuild } from 'react-router';
  const build: ServerBuild;
  export default build;
}

declare module 'cloudflare:workers' {
  /**
   * Workflow event passed to the run method
   */
  export interface WorkflowEvent<T = unknown> {
    payload: T;
    timestamp: Date;
  }

  /**
   * Workflow step for durable execution
   */
  export interface WorkflowStep {
    /**
     * Run a step with automatic retry and durability
     */
    run<T>(name: string, callback: () => Promise<T> | T): Promise<T>;

    /**
     * Sleep for a duration
     */
    sleep(name: string, duration: string | number): Promise<void>;

    /**
     * Wait for an external event
     */
    waitForEvent<T = unknown>(name: string, options?: { timeout?: string | number }): Promise<T>;
  }

  /**
   * Base class for workflow entrypoints
   */
  export abstract class WorkflowEntrypoint<
    Env = unknown,
    Params = unknown
  > {
    protected env: Env;
    protected ctx: ExecutionContext;

    abstract run(event: WorkflowEvent<Params>, step: WorkflowStep): Promise<unknown>;
  }
}

// Extend the global Workflow interface if not already declared
declare global {
  interface Workflow {
    create(options: { params: unknown }): Promise<{ id: string }>;
    get(id: string): Promise<{ status: string; output?: unknown }>;
  }

  /**
   * Cloudflare Queue interface for sending messages
   */
  interface Queue<T = unknown> {
    send(message: T): Promise<void>;
    sendBatch(messages: { body: T }[]): Promise<void>;
  }
}

export {};
