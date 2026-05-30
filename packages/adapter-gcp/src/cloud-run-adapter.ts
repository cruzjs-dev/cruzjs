/**
 * Google Cloud Run Runtime Adapter
 *
 * For containerized deployments on Cloud Run (serverless or always-on).
 * Uses env vars: DATABASE_URL, REDIS_URL, GCS_BUCKET, OPENAI_API_KEY
 */
import type {
  RuntimeAdapter,
  RuntimeType,
  CacheBinding,
  QueueBinding,
  AIBinding,
  LocalQueueLike,
} from '@cruzjs/core/runtime';
import { setDialectBuilder, pgBuilder } from '@cruzjs/drizzle-universal';
import { MemoryCacheBinding } from './bindings/memory-cache';
import { MemoryQueueBinding } from './bindings/memory-queue';
import { OpenAICompatibleAIBinding } from './bindings/openai-ai';
import { GCPCloudLoggingAdapter } from './bindings/logging';
import { GCPRedisRateLimitAdapter } from './bindings/rate-limit';
import { GCPFirestoreSchedulerAdapter } from './bindings/scheduler';
import { GCPBroadcastAdapter } from './bindings/broadcast';
import { GCPSearchAdapter } from './bindings/search';
import { GCPSessionAdapter } from './bindings/sessions';

export interface GCPCloudRunAdapterConfig {
  databaseUrl?: string;
  redisUrl?: string;
  gcsBucket?: string;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  /** If true, CPU is always allocated (background work safe) */
  cpuAlwaysAllocated?: boolean;
}

export class GCPCloudRunAdapter implements RuntimeAdapter {
  readonly name = 'gcp-cloud-run';
  readonly type: RuntimeType = 'container';

  private config: GCPCloudRunAdapterConfig;
  private localQueues = new Map<string, MemoryQueueBinding>();

  constructor(config?: GCPCloudRunAdapterConfig) {
    this.config = config || {};
  }

  async init(_context: unknown): Promise<void> {
    // Cloud Run deployments use PostgreSQL
    setDialectBuilder(pgBuilder);
  }

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
    return new GCPRedisRateLimitAdapter(this.config.redisUrl || process.env.REDIS_URL || null);
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
    if (this.config.cpuAlwaysAllocated) {
      promise.catch((err) =>
        console.error('[GCPCloudRun] Background work failed:', err),
      );
    }
    // If CPU is not always allocated, background work may be killed after response
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
      projectId: process.env.GCP_PROJECT_ID || 'unknown',
      region:
        process.env.GCP_REGION || process.env.CLOUD_RUN_REGION || 'unknown',
    };
  }

  clear(): void {
    this.localQueues.clear();
  }
}
