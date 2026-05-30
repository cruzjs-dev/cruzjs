/**
 * Docker / Self-Hosted Runtime Adapter
 *
 * For deployments on Dokploy, Coolify, bare Docker, Docker Compose, Kubernetes.
 * Uses standard environment variables: DATABASE_URL, REDIS_URL, S3_BUCKET, etc.
 */
import type { RuntimeAdapter, RuntimeType, CacheBinding, QueueBinding, AIBinding, LocalQueueLike } from '@cruzjs/core/runtime';
import { setDialectBuilder, pgBuilder } from '@cruzjs/drizzle-universal';
import { MemoryCacheBinding } from './bindings/memory-cache';
import { MemoryQueueBinding } from './bindings/memory-queue';
import { OpenAICompatibleAIBinding } from './bindings/openai-ai';
import { DockerLogAdapter } from './bindings/logging';
import { DockerRedisRateLimitAdapter } from './bindings/rate-limit';
import { DockerRedisSchedulerAdapter } from './bindings/scheduler';
import { DockerBroadcastAdapter } from './bindings/broadcast';
import { DockerSearchAdapter } from './bindings/search';
import { DockerRedisSessionAdapter } from './bindings/sessions';

export interface DockerAdapterConfig {
  databaseUrl?: string;
  redisUrl?: string;
  s3Bucket?: string;
  s3Endpoint?: string;
  storagePath?: string;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
}

export class DockerAdapter implements RuntimeAdapter {
  readonly name = 'docker';
  readonly type: RuntimeType = 'container';
  private config: DockerAdapterConfig;
  private localQueues = new Map<string, MemoryQueueBinding>();

  constructor(config?: DockerAdapterConfig) { this.config = config || {}; }

  async init(_context: unknown): Promise<void> {
    // Docker deployments use PostgreSQL
    setDialectBuilder(pgBuilder);
  }

  getDatabase(): unknown {
    return this.config.databaseUrl || process.env.DATABASE_URL || null;
  }

  getCache(namespace?: string): CacheBinding {
    return new MemoryCacheBinding(namespace || 'app');
  }

  getQueue<T = unknown>(name: string): QueueBinding<T> {
    if (!this.localQueues.has(name)) this.localQueues.set(name, new MemoryQueueBinding(name));
    return this.localQueues.get(name) as unknown as QueueBinding<T>;
  }

  getLocalQueue<T = unknown>(name: string): LocalQueueLike<T> | null {
    return (this.localQueues.get(name) as unknown as LocalQueueLike<T>) ?? null;
  }

  getAI(): AIBinding | null {
    const apiKey = this.config.openaiApiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) return null;
    // Support Ollama (localhost:11434), vLLM, or any OpenAI-compatible API
    const baseUrl = this.config.openaiBaseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    return new OpenAICompatibleAIBinding(apiKey, baseUrl);
  }

  getLogger(): DockerLogAdapter {
    return new DockerLogAdapter();
  }

  getRateLimiter(): DockerRedisRateLimitAdapter {
    return new DockerRedisRateLimitAdapter(this.config.redisUrl || process.env.REDIS_URL || null);
  }

  getScheduler(): DockerRedisSchedulerAdapter {
    return new DockerRedisSchedulerAdapter(this.config.redisUrl || process.env.REDIS_URL || null);
  }

  getBroadcast(): DockerBroadcastAdapter {
    return new DockerBroadcastAdapter(this.config.redisUrl || process.env.REDIS_URL || null);
  }

  getSearch(): DockerSearchAdapter {
    return new DockerSearchAdapter(process.env.MEILISEARCH_URL || null);
  }

  getSessionAdapter(): DockerRedisSessionAdapter {
    return new DockerRedisSessionAdapter(this.config.redisUrl || process.env.REDIS_URL || null);
  }

  getBinding<T = unknown>(name: string): T | null {
    return (process.env[name] as unknown as T) ?? null;
  }

  getStorageBucket(): unknown | null {
    return this.config.s3Bucket || process.env.S3_BUCKET || null;
  }

  waitUntil(promise: Promise<unknown>): void {
    // Container mode — fire and forget is safe
    promise.catch((err) => console.error('[Docker] Background work failed:', err));
  }

  get env(): Record<string, string | undefined> {
    return process.env as Record<string, string | undefined>;
  }

  get diagnostics(): Record<string, unknown> {
    return {
      adapter: this.name,
      hasDatabaseUrl: !!this.getDatabase(),
      hasS3Bucket: !!this.getStorageBucket(),
      hasStoragePath: !!(this.config.storagePath || process.env.STORAGE_PATH),
      hasOpenAI: !!this.getAI(),
    };
  }

  clear(): void {
    this.localQueues.clear();
  }
}
