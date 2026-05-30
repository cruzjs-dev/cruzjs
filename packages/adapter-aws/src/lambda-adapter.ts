/**
 * AWS Lambda Runtime Adapter
 *
 * For serverless deployments behind API Gateway.
 * Uses environment variables for configuration (DATABASE_URL, REDIS_URL, etc.).
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

export interface AWSLambdaAdapterConfig {
  /** Database URL (postgres or mysql connection string) */
  databaseUrl?: string;
  /** Redis URL for caching (falls back to in-memory) */
  redisUrl?: string;
  /** S3 bucket name for storage */
  s3Bucket?: string;
  /** OpenAI API key for AI features */
  openaiApiKey?: string;
  /** OpenAI base URL (for Bedrock gateway or custom endpoints) */
  openaiBaseUrl?: string;
}

export class AWSLambdaAdapter implements RuntimeAdapter {
  readonly name = 'aws-lambda';
  readonly type: RuntimeType = 'serverless';

  private config: AWSLambdaAdapterConfig;
  private pendingWork: Promise<unknown>[] = [];
  private localQueues = new Map<string, MemoryQueueBinding>();

  constructor(config?: AWSLambdaAdapterConfig) {
    this.config = config || {};
  }

  async init(_context: unknown): Promise<void> {
    setDialectBuilder(pgBuilder);
    // Lambda gets config from environment variables
    // No per-request initialization needed - connections are reused across invocations
  }

  getDatabase(): unknown {
    // Return the DATABASE_URL - the DrizzleService or adapter consumer handles connection
    return this.config.databaseUrl || process.env.DATABASE_URL || null;
  }

  getCache(namespace?: string): CacheBinding {
    // In-memory cache for Lambda (short-lived, reused across warm invocations)
    return new MemoryCacheBinding(namespace || 'app');
  }

  getQueue<T = unknown>(name: string): QueueBinding<T> {
    // In local dev, use memory queues
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
    // Lambda doesn't support background work after response
    // We collect promises and the handler must await them before returning
    this.pendingWork.push(promise);
  }

  /** Await all pending background work (call before returning Lambda response) */
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
      hasS3Bucket: !!this.getStorageBucket(),
      hasOpenAI: !!this.getAI(),
      region: process.env.AWS_REGION || 'unknown',
    };
  }

  clear(): void {
    this.localQueues.clear();
    this.pendingWork = [];
  }
}
