/**
 * AWS Fargate (ECS) Runtime Adapter
 *
 * For long-running container deployments.
 * Supports persistent connections, connection pooling, and background work.
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
import { AWSCloudWatchLogAdapter } from './bindings/logging';
import { RedisRateLimitAdapter } from './bindings/rate-limit';
import { DynamoDBSchedulerAdapter } from './bindings/scheduler';
import { AWSBroadcastAdapter } from './bindings/broadcast';
import { AWSOpenSearchAdapter } from './bindings/search';
import { AWSSessionAdapter } from './bindings/sessions';

export interface AWSFargateAdapterConfig {
  databaseUrl?: string;
  redisUrl?: string;
  s3Bucket?: string;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
}

export class AWSFargateAdapter implements RuntimeAdapter {
  readonly name = 'aws-fargate';
  readonly type: RuntimeType = 'container';

  private config: AWSFargateAdapterConfig;
  private localQueues = new Map<string, MemoryQueueBinding>();

  constructor(config?: AWSFargateAdapterConfig) {
    this.config = config || {};
  }

  async init(_context: unknown): Promise<void> {
    // AWS Fargate deployments use PostgreSQL (RDS, Aurora, Neon, etc.)
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

  getLogger(): AWSCloudWatchLogAdapter {
    return new AWSCloudWatchLogAdapter();
  }

  getRateLimiter(): RedisRateLimitAdapter {
    return new RedisRateLimitAdapter(this.config.redisUrl || process.env.REDIS_URL || null);
  }

  getScheduler(): DynamoDBSchedulerAdapter {
    return new DynamoDBSchedulerAdapter(process.env.SCHEDULER_LOCKS_TABLE || null);
  }

  getBroadcast(): AWSBroadcastAdapter {
    return new AWSBroadcastAdapter(
      this.config.redisUrl || process.env.REDIS_URL || null,
      process.env.BROADCAST_PRESENCE_TABLE || null,
    );
  }

  getSearch(): AWSOpenSearchAdapter {
    return new AWSOpenSearchAdapter(process.env.OPENSEARCH_ENDPOINT || null);
  }

  getSessionAdapter(): AWSSessionAdapter {
    return new AWSSessionAdapter(process.env.SESSION_TABLE || null);
  }

  getBinding<T = unknown>(name: string): T | null {
    return (process.env[name] as unknown as T) ?? null;
  }

  getStorageBucket(): unknown | null {
    return this.config.s3Bucket || process.env.S3_BUCKET || null;
  }

  waitUntil(promise: Promise<unknown>): void {
    // Container mode - fire and forget is safe
    promise.catch((err) =>
      console.error('[AWSFargate] Background work failed:', err),
    );
  }

  get env(): Record<string, string | undefined> {
    return process.env as Record<string, string | undefined>;
  }

  get diagnostics(): Record<string, unknown> {
    return {
      adapter: this.name,
      hasDatabaseUrl: !!this.getDatabase(),
      hasS3Bucket: !!this.getStorageBucket(),
      hasOpenAI: !!this.getAI(),
      region: process.env.AWS_REGION || 'unknown',
    };
  }

  clear(): void {
    this.localQueues.clear();
  }
}
