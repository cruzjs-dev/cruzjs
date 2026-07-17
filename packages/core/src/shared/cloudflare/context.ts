/**
 * Cloudflare Context
 *
 * Centralized access to Cloudflare environment bindings (D1, KV, R2, Queues, AI).
 * Call `CloudflareContext.init(loadContext)` once per request to extract bindings
 * from the React Router load context and initialize the database.
 */

import { DrizzleService } from '../database/drizzle.service';
import { LocalKVNamespace } from './local-kv';
import { LocalQueue } from './local-queue';

export interface CloudflareEnv {
  // KV Namespaces
  CACHE_KV?: KVNamespace;

  // R2 Buckets
  UPLOADS_BUCKET?: R2Bucket;
  STORAGE?: R2Bucket; // Alternative binding name

  // D1 Database
  DB?: D1Database;

  // Workers AI
  AI?: unknown;

  // Queues and other bindings are accessed dynamically via getBinding()
  [key: string]: unknown;
}

export class CloudflareContext {
  private static env: CloudflareEnv | null = null;
  private static localKV: LocalKVNamespace | null = null;
  private static localQueues = new Map<string, LocalQueue>();

  /**
   * Initialize from a React Router load context.
   * Extracts Cloudflare env bindings, bridges string values to process.env,
   * and initializes the database (D1 or local SQLite fallback).
   *
   * When running locally (no CF env), provides in-memory facades for KV
   * so that caching works during development.
   */
  static async init(loadContext: unknown): Promise<void> {
    // Prefer the nested `cloudflare.env` shape (CF Pages/Workers dev proxy), but
    // fall back to a flat `context.env` so runtimes/adapters that supply only
    // the flat shape still get their bindings bridged.
    const ctx = loadContext as { cloudflare?: { env?: CloudflareEnv }; env?: CloudflareEnv } | undefined;
    const env = (ctx?.cloudflare?.env ?? ctx?.env) as CloudflareEnv | undefined;

    if (env) {
      this.env = env;

      // Bridge string values to process.env for ConfigService compatibility
      for (const [key, value] of Object.entries(env)) {
        if (typeof value === 'string') {
          process.env[key] = value;
        }
      }
    }

    // Provide local KV facade when no CF KV binding is available
    if (!this.env?.CACHE_KV) {
      if (!this.localKV) {
        this.localKV = new LocalKVNamespace();
        console.log('[CloudflareContext] KV not available, using in-memory local facade');
      }
    }

    await DrizzleService.initFromContext(env?.DB);
  }

  /** D1 database binding */
  static get db(): D1Database | null {
    return this.env?.DB ?? null;
  }

  /** KV namespace for caching (falls back to in-memory facade locally) */
  static get kv(): KVNamespace | null {
    return this.env?.CACHE_KV ?? (this.localKV as unknown as KVNamespace) ?? null;
  }

  /** R2 bucket for uploads/storage */
  static get r2(): R2Bucket | null {
    return this.env?.UPLOADS_BUCKET ?? this.env?.STORAGE ?? null;
  }

  /** Workers AI binding */
  static get ai(): unknown {
    return this.env?.AI ?? null;
  }

  /**
   * Get a queue binding by name.
   * Returns the Cloudflare Queue in production, or a LocalQueue facade in development.
   *
   * @example
   * ```ts
   * const queue = CloudflareContext.getQueue<MyMessage>('MY_QUEUE');
   * await queueService.send(queue, message);
   * ```
   */
  static getQueue<T = unknown>(bindingName: string): { send(message: T): Promise<void>; sendBatch(messages: { body: T }[]): Promise<void> } {
    // Return CF binding if available
    const cfQueue = this.env?.[bindingName];
    if (cfQueue && typeof (cfQueue as any).send === 'function') {
      return cfQueue as Queue<T>;
    }

    // Local dev: return or create a LocalQueue facade
    if (!this.localQueues.has(bindingName)) {
      const localQueue = new LocalQueue<T>(bindingName);
      this.localQueues.set(bindingName, localQueue as LocalQueue);
      console.log(`[CloudflareContext] Queue "${bindingName}" not available, using local facade`);
    }
    return this.localQueues.get(bindingName) as unknown as LocalQueue<T>;
  }

  /**
   * Get the local queue instance for registering consumers.
   * Returns null in production (consumers run as CF Workers).
   */
  static getLocalQueue<T = unknown>(bindingName: string): LocalQueue<T> | null {
    const queue = this.localQueues.get(bindingName);
    return (queue as unknown as LocalQueue<T>) ?? null;
  }

  /**
   * Get any binding by name. Use for custom bindings not covered by named getters.
   */
  static getBinding<T = unknown>(name: string): T | null {
    return (this.env?.[name] as T) ?? null;
  }

  /** Full environment (for bindings not covered by named getters) */
  static get current(): CloudflareEnv | null {
    return this.env;
  }

  /** Diagnostic summary of which bindings are available */
  static get diagnostics(): Record<string, unknown> {
    return {
      hasEnv: !!this.env,
      hasDB: !!this.db,
      hasCacheKV: !!this.kv,
      hasStorage: !!this.r2,
      hasAI: !!this.ai,
      envKeys: this.env ? Object.keys(this.env) : [],
    };
  }

  /** Clear the environment (useful for testing) */
  static clear(): void {
    this.env = null;
    this.localKV = null;
    this.localQueues.clear();
  }
}
