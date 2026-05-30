/**
 * Google Cloud Functions Runtime Adapter
 *
 * For serverless function deployments on Cloud Functions (1st or 2nd gen).
 * Uses env vars: DATABASE_URL, GCS_BUCKET, OPENAI_API_KEY
 */
import type {
  RuntimeAdapter,
  RuntimeType,
  CacheBinding,
  QueueBinding,
  AIBinding,
  LocalQueueLike,
} from '@cruzjs/core/runtime';
import { MemoryCacheBinding } from './bindings/memory-cache';
import { MemoryQueueBinding } from './bindings/memory-queue';
import { OpenAICompatibleAIBinding } from './bindings/openai-ai';
import { GCPCloudLoggingAdapter } from './bindings/logging';
import { GCPRedisRateLimitAdapter } from './bindings/rate-limit';
import { GCPFirestoreSchedulerAdapter } from './bindings/scheduler';
import { GCPBroadcastAdapter } from './bindings/broadcast';
import { GCPSearchAdapter } from './bindings/search';
import { GCPSessionAdapter } from './bindings/sessions';

export interface GCPCloudFunctionsAdapterConfig {
  databaseUrl?: string;
  gcsBucket?: string;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
}

export class GCPCloudFunctionsAdapter implements RuntimeAdapter {
  readonly name = 'gcp-cloud-functions';
  readonly type: RuntimeType = 'serverless';

  private config: GCPCloudFunctionsAdapterConfig;
  private localQueues = new Map<string, MemoryQueueBinding>();
  private pendingWork: Promise<unknown>[] = [];

  constructor(config?: GCPCloudFunctionsAdapterConfig) {
    this.config = config || {};
  }

  async init(_context: unknown): Promise<void> {}

  getDatabase(): unknown {
    return this.config.databaseUrl || process.env.DATABASE_URL || null;
  }

  getCache(namespace?: string): CacheBinding {
    return new MemoryCacheBinding(namespace || 'app');
  }

  getQueue<T = unknown>(name: string): QueueBinding<T> {
    if (!this.localQueues.has(name)) {
      this.localQueues.set(name, new MemoryQueueBinding(name));
    }
    return this.localQueues.get(name) as unknown as QueueBinding<T>;
  }

  getLocalQueue<T = unknown>(name: string): LocalQueueLike<T> | null {
    return (this.localQueues.get(name) as unknown as LocalQueueLike<T>) ?? null;
  }

  getAI(): AIBinding | null {
    const apiKey = this.config.openaiApiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) return null;
    return new OpenAICompatibleAIBinding(
      apiKey,
      this.config.openaiBaseUrl || process.env.OPENAI_BASE_URL,
    );
  }

  getLogger(): GCPCloudLoggingAdapter {
    return new GCPCloudLoggingAdapter();
  }

  getRateLimiter(): GCPRedisRateLimitAdapter {
    return new GCPRedisRateLimitAdapter(process.env.REDIS_URL || null);
  }

  getScheduler(): GCPFirestoreSchedulerAdapter {
    return new GCPFirestoreSchedulerAdapter(process.env.GCP_PROJECT_ID || null);
  }

  getBroadcast(): GCPBroadcastAdapter {
    return new GCPBroadcastAdapter(process.env.GCP_PROJECT_ID || null);
  }

  getSearch(): GCPSearchAdapter {
    return new GCPSearchAdapter();
  }

  getSessionAdapter(): GCPSessionAdapter {
    return new GCPSessionAdapter(process.env.GCP_PROJECT_ID || null);
  }

  getBinding<T = unknown>(name: string): T | null {
    return (process.env[name] as unknown as T) ?? null;
  }

  getStorageBucket(): unknown | null {
    return this.config.gcsBucket || process.env.GCS_BUCKET || null;
  }

  waitUntil(promise: Promise<unknown>): void {
    this.pendingWork.push(promise);
  }

  /** Flush all pending background work. Call before function exits. */
  async flushPendingWork(): Promise<void> {
    await Promise.allSettled(this.pendingWork);
    this.pendingWork = [];
  }

  get env(): Record<string, string | undefined> {
    return process.env as Record<string, string | undefined>;
  }

  get diagnostics(): Record<string, unknown> {
    return {
      adapter: this.name,
      hasDatabaseUrl: !!this.getDatabase(),
      hasGCSBucket: !!this.getStorageBucket(),
      hasOpenAI: !!this.getAI(),
    };
  }

  clear(): void {
    this.localQueues.clear();
    this.pendingWork = [];
  }
}
