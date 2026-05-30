/**
 * Log Context — AsyncLocalStorage-based request context propagation.
 *
 * Automatically injects requestId, userId, orgId, traceId, and spanId
 * into every log entry made within a request scope.
 *
 * Runtime requirements:
 * - Node.js: works out of the box (uses node:async_hooks)
 * - Cloudflare Workers: requires `compatibility_flags = ["nodejs_compat"]` in wrangler.toml
 *   Without this flag the Workers bundle will fail — this is intentional so the
 *   missing flag is surfaced at build time rather than silently losing context.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import type { LogContextStore } from './log.types';

class LogContextClass {
  private readonly als = new AsyncLocalStorage<LogContextStore>();

  run<T>(store: LogContextStore, fn: () => T): T {
    return this.als.run(store, fn);
  }

  getStore(): LogContextStore | undefined {
    return this.als.getStore();
  }

  set(key: string, value: unknown): void {
    const store = this.als.getStore();
    if (store) {
      store[key] = value;
    }
  }

  get<T = unknown>(key: string): T | undefined {
    const store = this.als.getStore();
    return store ? (store[key] as T) : undefined;
  }
}

export const LogContext = new LogContextClass();
