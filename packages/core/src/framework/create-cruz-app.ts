/**
 * createCruzApp — Unified Worker Bootstrap
 *
 * Produces a single Cloudflare Worker export that handles:
 * - `fetch()` — React Router SSR (Pages)
 * - `queue()` — Queue consumers (jobs queue built-in + user-defined)
 * - `scheduled()` — Cron triggers
 *
 * Supports an optional `adapter` field for the provider-agnostic RuntimeAdapter
 * pattern. When provided, the adapter is initialized alongside CloudflareContext
 * for backward compatibility.
 *
 * @example
 * ```ts
 * // server.cloudflare.ts
 * import { CloudflareAdapter } from '@cruzjs/adapter-cloudflare';
 *
 * export default createCruzApp({
 *   schema,
 *   modules: [StartModule, ...],
 *   pages: () => import('virtual:react-router/server-build'),
 *   adapter: new CloudflareAdapter(),
 * });
 * ```
 */

import type { CruzContainer, ModuleClass } from '../di';
import type { RuntimeAdapter } from '../runtime';
import { CloudflareContext } from '../shared/cloudflare/context';
import { DrizzleService } from '../shared/database/drizzle.service';
import { getOrBuildContainer } from './application.server';
import { registerModules } from './module-registry';
import { RouteRegistry } from './route-registry';
import { JOBS_QUEUE_BINDING } from '../queues/queue.types';
import type { JobQueueMessage } from '../queues/queue.types';
import { handleJobMessage } from '../jobs/job-queue.consumer';
import { setLocalQueueHandlers, type QueueHandler } from './local-queue-registry';

// ─── Types ──────────────────────────────────────────────────────────────────

// Re-export QueueHandler from the registry for convenience
export type { QueueHandler } from './local-queue-registry';

/**
 * A scheduled (cron) handler.
 */
export type ScheduledHandler = {
  /** Cron expression (e.g. '0 * * * *') — used for wrangler.toml generation and docs */
  cron: string;
  /** Handler function called when the cron fires */
  handler: (container: CruzContainer) => Promise<void>;
};

/**
 * Configuration for createCruzApp.
 */
export type CruzAppConfig = {
  /** Database schema object (from `import * as schema from './database/schema'`) */
  schema: Record<string, unknown>;

  /**
   * Modules to load. Each module is a class decorated with @Module().
   */
  modules?: ModuleClass[];

  /**
   * Pages handler — provides the React Router server build.
   *
   * @example
   * ```ts
   * pages: () => import('virtual:react-router/server-build')
   * ```
   */
  pages: () => Promise<{ default: any }>;

  /**
   * Queue consumers keyed by binding name.
   * The built-in JOBS_QUEUE is handled automatically.
   */
  queues?: Record<string, QueueHandler>;

  /**
   * Scheduled (cron) handlers.
   */
  scheduled?: ScheduledHandler[];

  /**
   * Optional RuntimeAdapter for the provider-agnostic pattern.
   */
  adapter?: RuntimeAdapter;

  /**
   * Enable maintenance mode middleware.
   */
  maintenanceMode?: boolean | { excludePaths?: string[] };

  /**
   * Environment variables required by the application.
   * Validated at container build time (first request). If any are missing,
   * the app will throw with a descriptive error message.
   *
   * @example
   * requiredEnv: ['APP_URL', 'SESSION_SECRET']
   */
  requiredEnv?: string[];
};

// ─── Implementation ─────────────────────────────────────────────────────────

/**
 * Module-level flag: has the adapter's one-time `bootstrap()` been called?
 * Prevents repeated bootstrap work across requests in long-lived runtimes.
 */
let adapterBootstrapped = false;

/**
 * Initialize the adapter for a request. Calls `bootstrap()` once on first
 * invocation, then delegates to `bindRequest()` (or falls back to `init()`)
 * for every request.
 */
async function initAdapter(adapter: RuntimeAdapter | undefined, loadCtx: unknown): Promise<void> {
  if (!adapter) return;

  // One-time bootstrap
  if (!adapterBootstrapped && adapter.bootstrap) {
    await adapter.bootstrap();
    adapterBootstrapped = true;
  } else if (!adapterBootstrapped) {
    adapterBootstrapped = true;
  }

  // Per-request binding
  if (adapter.bindRequest) {
    await adapter.bindRequest(loadCtx);
  } else {
    await adapter.init(loadCtx);
  }
}

/**
 * Create a unified Cloudflare Worker/Pages export.
 *
 * Returns `{ fetch, queue, scheduled }` — the three handlers a CF Worker supports.
 */
export function createCruzApp(config: CruzAppConfig) {
  const { schema, modules: rawModules = [], pages, queues = {}, scheduled = [], adapter, maintenanceMode = false, requiredEnv: configRequiredEnv } = config;

  // Reset bootstrap flag when a new app is created (supports tests / HMR)
  adapterBootstrapped = false;

  // Register modules globally — handlers pick them up via getRegisteredModules()
  registerModules(rawModules);

  // Resolve maintenance config
  const maintenanceEnabled = !!maintenanceMode;
  const maintenanceExcludePaths =
    typeof maintenanceMode === 'object' ? maintenanceMode.excludePaths : undefined;

  // One-time schema setup
  DrizzleService.setSchema(schema);

  // ── fetch handler (Pages — React Router SSR) ────────────────────────────

  async function handleFetch(
    request: Request,
    env: unknown,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const envRecord = env as Record<string, unknown>;
    const url = new URL(request.url);

    // Health check — fast path, no container needed
    if (url.pathname === '/api/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          runtime: adapter?.name ?? 'cloudflare-pages',
          runtimeType: adapter?.type ?? 'edge',
          timestamp: new Date().toISOString(),
          queues: ['JOBS_QUEUE', ...Object.keys(queues)],
          scheduled: scheduled.map((s) => s.cron),
          ...(adapter && { diagnostics: adapter.diagnostics }),
        }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Dev-mode diagnostics endpoint
    if (url.pathname === '/api/__diagnostics' && (envRecord.NODE_ENV === 'development' || envRecord.DEV === 'true')) {
      try {
        const loadCtx = { cloudflare: { env } };
        await CloudflareContext.init(loadCtx);
        await initAdapter(adapter, loadCtx);
        const { container } = await getOrBuildContainer(rawModules, adapter, configRequiredEnv);
        const routeRegistry = container.resolve(RouteRegistry);
        const trpcRouterMap = routeRegistry.getTRPCRouters();

        const diagnostics = {
          modules: rawModules.map((m) => m.name),
          trpcRouters: Array.from(trpcRouterMap.keys()),
          adapter: adapter ? { name: adapter.name, type: adapter.type } : null,
          envVars: Object.keys(envRecord).filter(
            (k) =>
              !k.toLowerCase().includes('secret') &&
              !k.toLowerCase().includes('key') &&
              !k.toLowerCase().includes('token'),
          ),
          timestamp: new Date().toISOString(),
        };

        return new Response(JSON.stringify(diagnostics, null, 2), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: String(error) }),
          { status: 500, headers: { 'Content-Type': 'application/json' } },
        );
      }
    }

    // Manual scheduled trigger for local dev
    if (url.pathname === '/api/__scheduled' && request.method === 'POST') {
      try {
        const loadCtx = { cloudflare: { env } };
        await CloudflareContext.init(loadCtx);
        await initAdapter(adapter, loadCtx);
        const { container } = await getOrBuildContainer(rawModules, adapter, configRequiredEnv);
        for (const { handler } of scheduled) {
          await handler(container);
        }
        return new Response(
          JSON.stringify({ ok: true, ran: scheduled.length }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      } catch (error) {
        console.error('[CruzApp] Manual scheduled trigger error:', error);
        return new Response(
          JSON.stringify({ error: String(error) }),
          { status: 500, headers: { 'Content-Type': 'application/json' } },
        );
      }
    }

    // ── Maintenance mode check ──────────────────────────────────────────
    if (maintenanceEnabled) {
      try {
        const loadCtx = { cloudflare: { env: envRecord } };
        await CloudflareContext.init(loadCtx);
        await initAdapter(adapter, loadCtx);
        const { container } = await getOrBuildContainer(rawModules, adapter, configRequiredEnv);
        const { MaintenanceService } = await import('@cruzjs/core/maintenance/maintenance.service');
        const { withMaintenanceCheck, buildBypassCookieHeader } = await import('@cruzjs/core/maintenance/maintenance.middleware');

        if (container.isBound(MaintenanceService)) {
          const maintenanceService = container.resolve(MaintenanceService);
          const maintenanceResponse = await withMaintenanceCheck(
            request,
            maintenanceService,
            maintenanceExcludePaths,
          );
          if (maintenanceResponse) {
            return maintenanceResponse;
          }

          // If bypassed via query param, set cookie on the eventual response
          const bypassParam = url.searchParams.get('bypass');
          if (bypassParam) {
            const state = await maintenanceService.getState();
            if (state.active && state.secret && bypassParam === state.secret) {
              // Wrap the downstream response to add Set-Cookie
              const downstreamResponse = await servePages(request, envRecord, ctx);
              const newResponse = new Response(downstreamResponse.body, downstreamResponse);
              newResponse.headers.append('Set-Cookie', buildBypassCookieHeader(state.secret));
              return newResponse;
            }
          }
        }
      } catch (error) {
        // If maintenance check fails, proceed with the request
        console.error('[CruzApp] Maintenance check error:', error);
      }
    }

    return servePages(request, envRecord, ctx);
  }

  async function servePages(
    request: Request,
    envRecord: Record<string, unknown>,
    ctx: ExecutionContext,
  ): Promise<Response> {
    try {
      const { default: serverBuild } = await pages();
      const { createRequestHandler } = await import('react-router');
      const handler = createRequestHandler(serverBuild, 'production');

      return await handler(request, {
        cloudflare: { env: envRecord },
        env: envRecord,
        waitUntil: ctx.waitUntil.bind(ctx),
        [Symbol.for('cloudflare:env')]: envRecord,
      });
    } catch (error) {
      console.error('[CruzApp] Request error:', error);
      const isDev = (envRecord as any).NODE_ENV === 'development';
      return new Response(
        JSON.stringify({
          error: {
            message: 'Internal Server Error',
            ...(isDev && {
              details: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            }),
          },
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }
  }

  // ── queue handler ───────────────────────────────────────────────────────

  async function handleQueue(
    batch: MessageBatch,
    env: unknown,
    ctx: ExecutionContext,
  ): Promise<void> {
    const envRecord = env as Record<string, unknown>;
    const loadCtx = { cloudflare: { env: envRecord } };
    await CloudflareContext.init(loadCtx);
    await initAdapter(adapter, loadCtx);
    const { container } = await getOrBuildContainer(rawModules, adapter, configRequiredEnv);

    const queueName = batch.queue;

    // Built-in jobs queue
    if (queueName === JOBS_QUEUE_BINDING || isJobsQueue(queueName)) {
      try {
        for (const msg of batch.messages) {
          try {
            await handleJobMessage(msg.body as JobQueueMessage, container);
            msg.ack();
          } catch (error) {
            console.error(`[CruzApp] Job message error:`, error);
            msg.retry();
          }
        }
      } catch (error) {
        console.error('[CruzApp] Jobs queue error:', error);
        for (const msg of batch.messages) {
          msg.retry();
        }
      }
      return;
    }

    // User-defined queue handler — match by binding name
    const handlerKey = findQueueHandlerKey(queueName, queues);
    if (handlerKey) {
      const handler = queues[handlerKey];
      try {
        const messages = batch.messages.map((msg) => msg.body);
        await handler(messages, container);
        for (const msg of batch.messages) {
          msg.ack();
        }
      } catch (error) {
        console.error(`[CruzApp] Queue "${queueName}" handler error:`, error);
        for (const msg of batch.messages) {
          msg.retry();
        }
      }
      return;
    }

    console.warn(`[CruzApp] No handler registered for queue: ${queueName}`);
    for (const msg of batch.messages) {
      msg.retry();
    }
  }

  // ── scheduled handler ─────────────────────────────────────────────────

  async function handleScheduled(
    controller: ScheduledController,
    env: unknown,
    ctx: ExecutionContext,
  ): Promise<void> {
    const envRecord = env as Record<string, unknown>;
    const loadCtx = { cloudflare: { env: envRecord } };
    await CloudflareContext.init(loadCtx);
    await initAdapter(adapter, loadCtx);
    const { container } = await getOrBuildContainer(rawModules, adapter, configRequiredEnv);

    console.log(`[CruzApp] Scheduled event: ${controller.cron}`);

    // Run all handlers whose cron matches, or all if cron is '*'
    for (const { cron, handler } of scheduled) {
      if (cron === controller.cron || cron === '*') {
        try {
          await handler(container);
        } catch (error) {
          console.error(`[CruzApp] Scheduled handler error (${cron}):`, error);
        }
      }
    }
  }

  // Store user queue handlers so buildContainerWithModules can register
  // local consumers in both the CF Pages context and Vite SSR context.
  if (Object.keys(queues).length > 0) {
    setLocalQueueHandlers(queues);
  }

  // ── Return the Cloudflare Worker export object ────────────────────────

  return {
    fetch: handleFetch,
    queue: handleQueue,
    scheduled: handleScheduled,
  } satisfies ExportedHandler;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function isJobsQueue(queueName: string): boolean {
  if (queueName === JOBS_QUEUE_BINDING) return true;
  return false;
}

function findQueueHandlerKey(
  queueName: string,
  handlers: Record<string, QueueHandler>,
): string | null {
  if (handlers[queueName]) return queueName;
  const bindingStyle = queueName.toUpperCase().replace(/-/g, '_');
  if (handlers[bindingStyle]) return bindingStyle;
  if (handlers[`${bindingStyle}_QUEUE`]) return `${bindingStyle}_QUEUE`;
  return null;
}
