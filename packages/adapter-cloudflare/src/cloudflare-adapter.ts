/**
 * Cloudflare Workers/Pages Runtime Adapter
 *
 * Bridges Cloudflare's environment bindings (D1, KV, R2, Queues, AI)
 * to the CruzJS RuntimeAdapter interface.
 */

import type {
  RuntimeAdapter,
  RuntimeType,
  CacheBinding,
  QueueBinding,
  AIBinding,
  LocalQueueLike,
} from '@cruzjs/core/runtime';
import { setDialectBuilder, sqliteBuilder } from '@cruzjs/drizzle-universal';
import { CloudflareCacheBinding } from './bindings/cache';
import {
  CloudflareQueueBinding,
  CloudflareLocalQueue,
} from './bindings/queue';
import { CloudflareAIBinding } from './bindings/ai';
import { CloudflareLogAdapter } from './bindings/logging';
import { CloudflareKVRateLimitAdapter } from './bindings/rate-limit';
import { CloudflareKVSchedulerAdapter } from './bindings/scheduler';
import { CloudflareBroadcastAdapter } from './bindings/broadcast';
import { KVSSEBackend } from '@cruzjs/core/broadcasting';
import { CloudflareFTSSearchAdapter } from './bindings/search';
import { CloudflareKVSessionAdapter } from './bindings/sessions';
import { CloudflareImageProcessor } from './bindings/image';

export interface CloudflareAdapterConfig {
  /** Override KV binding name (default: 'CACHE_KV') */
  kvBindingName?: string;
  /** Override R2 binding name (default: 'UPLOADS_BUCKET' or 'STORAGE') */
  r2BindingName?: string;
}

export class CloudflareAdapter implements RuntimeAdapter {
  readonly name = 'cloudflare';
  readonly type: RuntimeType = 'edge';

  private cfEnv: Record<string, unknown> | null = null;
  private localQueues = new Map<string, CloudflareLocalQueue>();
  private kvBindingName: string;
  private r2BindingName: string;

  constructor(config?: CloudflareAdapterConfig) {
    this.kvBindingName = config?.kvBindingName || 'CACHE_KV';
    this.r2BindingName = config?.r2BindingName || 'UPLOADS_BUCKET';
  }

  async init(context: unknown): Promise<void> {
    // Cloudflare D1 is SQLite under the hood
    setDialectBuilder(sqliteBuilder);

    const env = (context as any)?.cloudflare?.env as
      | Record<string, unknown>
      | undefined;
    if (env) {
      this.cfEnv = env;
      // Bridge string values to process.env for ConfigService compatibility
      for (const [key, value] of Object.entries(env)) {
        if (typeof value === 'string') {
          process.env[key] = value;
        }
      }
    }
  }

  getDatabase(): unknown {
    return this.cfEnv?.DB ?? null;
  }

  getCache(namespace?: string): CacheBinding {
    const kv = this.cfEnv?.[this.kvBindingName] as KVNamespace | undefined;
    return new CloudflareCacheBinding(kv ?? null, namespace || 'app');
  }

  getQueue<T = unknown>(name: string): QueueBinding<T> {
    // Return CF binding if available
    const cfQueue = this.cfEnv?.[name];
    if (cfQueue && typeof (cfQueue as any).send === 'function') {
      return new CloudflareQueueBinding<T>(cfQueue as any);
    }

    // Local dev: return or create a LocalQueue facade
    if (!this.localQueues.has(name)) {
      const localQueue = new CloudflareLocalQueue(name);
      this.localQueues.set(name, localQueue);
    }
    return this.localQueues.get(name) as unknown as QueueBinding<T>;
  }

  getLocalQueue<T = unknown>(name: string): LocalQueueLike<T> | null {
    const queue = this.localQueues.get(name);
    return (queue as unknown as LocalQueueLike<T>) ?? null;
  }

  getAI(): AIBinding | null {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const gatewayId = process.env.CF_AI_GATEWAY_ID;
    const gatewayToken = process.env.CF_AIG_TOKEN;
    if (!accountId || !gatewayId || !gatewayToken) return null;
    return new CloudflareAIBinding(
      {
        accountId,
        gatewayId,
        gatewayToken,
        apiKey: process.env.AI_API_KEY ?? null,
      },
      this.cfEnv?.AI ?? null,
    );
  }

  getLogger(): CloudflareLogAdapter {
    return new CloudflareLogAdapter();
  }

  getRateLimiter(): CloudflareKVRateLimitAdapter {
    const kv = this.cfEnv?.[this.kvBindingName] as KVNamespace | undefined;
    return new CloudflareKVRateLimitAdapter(kv ?? null);
  }

  getScheduler(): CloudflareKVSchedulerAdapter {
    const kv = this.cfEnv?.[this.kvBindingName] as KVNamespace | undefined;
    return new CloudflareKVSchedulerAdapter(kv ?? null);
  }

  getBroadcast(): CloudflareBroadcastAdapter {
    const kv = this.cfEnv?.[this.kvBindingName] as KVNamespace | undefined;
    return new CloudflareBroadcastAdapter(kv ?? null);
  }

  getSSEBackend(): KVSSEBackend | null {
    const kv = this.cfEnv?.[this.kvBindingName] as KVNamespace | undefined;
    return kv ? new KVSSEBackend(kv) : null;
  }

  getSearch(): CloudflareFTSSearchAdapter {
    return new CloudflareFTSSearchAdapter(this.cfEnv?.DB ?? null);
  }

  getSessionAdapter(): CloudflareKVSessionAdapter {
    const kv = this.cfEnv?.[this.kvBindingName] as KVNamespace | undefined;
    return new CloudflareKVSessionAdapter(kv ?? null);
  }

  getImageProcessor(): CloudflareImageProcessor {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? null;
    return new CloudflareImageProcessor(accountId);
  }

  getBinding<T = unknown>(name: string): T | null {
    return (this.cfEnv?.[name] as T) ?? null;
  }

  getStorageBucket(): unknown | null {
    return this.cfEnv?.[this.r2BindingName] ?? this.cfEnv?.STORAGE ?? null;
  }

  waitUntil(_promise: Promise<unknown>): void {
    // In the CF adapter, waitUntil is handled by the execution context passed to fetch/queue/scheduled
    // This method is a fallback — the real waitUntil should be called on ctx directly
  }

  get env(): Record<string, string | undefined> {
    return process.env as Record<string, string | undefined>;
  }

  get diagnostics(): Record<string, unknown> {
    return {
      adapter: this.name,
      hasEnv: !!this.cfEnv,
      hasDB: !!this.cfEnv?.DB,
      hasCacheKV: !!this.cfEnv?.[this.kvBindingName],
      hasStorage: !!this.getStorageBucket(),
      hasAI: !!this.cfEnv?.AI,
      envKeys: this.cfEnv ? Object.keys(this.cfEnv) : [],
    };
  }

  clear(): void {
    this.cfEnv = null;
    this.localQueues.clear();
  }
}
