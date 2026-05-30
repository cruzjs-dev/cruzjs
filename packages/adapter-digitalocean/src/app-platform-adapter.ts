import type { RuntimeAdapter, RuntimeType, CacheBinding, QueueBinding, AIBinding, LocalQueueLike } from '@cruzjs/core/runtime';
import { setDialectBuilder, pgBuilder } from '@cruzjs/drizzle-universal';
import { MemoryCacheBinding } from './bindings/memory-cache';
import { MemoryQueueBinding } from './bindings/memory-queue';
import { OpenAICompatibleAIBinding } from './bindings/openai-ai';
import { DigitalOceanLogAdapter } from './bindings/logging';
import { DigitalOceanRedisRateLimitAdapter } from './bindings/rate-limit';
import { DigitalOceanRedisSchedulerAdapter } from './bindings/scheduler';
import { DigitalOceanBroadcastAdapter } from './bindings/broadcast';
import { DOSearchAdapter } from './bindings/search';
import { DigitalOceanSessionAdapter } from './bindings/sessions';

export interface DigitalOceanAppPlatformAdapterConfig {
  databaseUrl?: string;
  redisUrl?: string;
  spacesBucket?: string;
  spacesEndpoint?: string;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
}

export class DigitalOceanAppPlatformAdapter implements RuntimeAdapter {
  readonly name = 'digitalocean-app-platform';
  readonly type: RuntimeType = 'container';
  private config: DigitalOceanAppPlatformAdapterConfig;
  private localQueues = new Map<string, MemoryQueueBinding>();

  constructor(config?: DigitalOceanAppPlatformAdapterConfig) { this.config = config || {}; }
  async init(_context: unknown): Promise<void> {
    // DigitalOcean App Platform deployments use PostgreSQL
    setDialectBuilder(pgBuilder);
  }
  getDatabase(): unknown { return this.config.databaseUrl || process.env.DATABASE_URL || null; }
  getCache(namespace?: string): CacheBinding { return new MemoryCacheBinding(namespace || 'app'); }
  getQueue<T = unknown>(name: string): QueueBinding<T> {
    if (!this.localQueues.has(name)) this.localQueues.set(name, new MemoryQueueBinding(name));
    return this.localQueues.get(name) as unknown as QueueBinding<T>;
  }
  getLocalQueue<T = unknown>(name: string): LocalQueueLike<T> | null { return (this.localQueues.get(name) as unknown as LocalQueueLike<T>) ?? null; }
  getAI(): AIBinding | null {
    const k = this.config.openaiApiKey || process.env.OPENAI_API_KEY;
    if (!k) return null;
    return new OpenAICompatibleAIBinding(k, this.config.openaiBaseUrl || process.env.OPENAI_BASE_URL);
  }
  getLogger(): DigitalOceanLogAdapter { return new DigitalOceanLogAdapter(); }
  getRateLimiter(): DigitalOceanRedisRateLimitAdapter {
    return new DigitalOceanRedisRateLimitAdapter(this.config.redisUrl || process.env.REDIS_URL || null);
  }
  getScheduler(): DigitalOceanRedisSchedulerAdapter {
    return new DigitalOceanRedisSchedulerAdapter(this.config.redisUrl || process.env.REDIS_URL || null);
  }
  getBroadcast(): DigitalOceanBroadcastAdapter {
    return new DigitalOceanBroadcastAdapter(this.config.redisUrl || process.env.REDIS_URL || null);
  }
  getSearch(): DOSearchAdapter {
    return new DOSearchAdapter();
  }
  getSessionAdapter(): DigitalOceanSessionAdapter {
    return new DigitalOceanSessionAdapter(this.config.redisUrl || process.env.REDIS_URL || null);
  }
  getBinding<T = unknown>(name: string): T | null { return (process.env[name] as unknown as T) ?? null; }
  getStorageBucket(): unknown | null { return this.config.spacesBucket || process.env.SPACES_BUCKET || null; }
  waitUntil(promise: Promise<unknown>): void { promise.catch((e) => console.error('[DO] Background failed:', e)); }
  get env(): Record<string, string | undefined> { return process.env as Record<string, string | undefined>; }
  get diagnostics(): Record<string, unknown> {
    return { adapter: this.name, hasDatabaseUrl: !!this.getDatabase(), hasSpacesBucket: !!this.getStorageBucket(), hasOpenAI: !!this.getAI() };
  }
  clear(): void { this.localQueues.clear(); }
}
