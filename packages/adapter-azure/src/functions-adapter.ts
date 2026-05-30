import type {
  RuntimeAdapter,
  RuntimeType,
  CacheBinding,
  QueueBinding,
  AIBinding,
  LocalQueueLike,
} from "@cruzjs/core/runtime";
import { MemoryCacheBinding } from "./bindings/memory-cache";
import { MemoryQueueBinding } from "./bindings/memory-queue";
import { OpenAICompatibleAIBinding } from "./bindings/openai-ai";
import { AzureMonitorLogAdapter } from "./bindings/logging";
import { AzureRedisRateLimitAdapter } from "./bindings/rate-limit";
import { AzureBlobLeaseSchedulerAdapter } from "./bindings/scheduler";
import { AzureBroadcastAdapter } from "./bindings/broadcast";
import { AzureCognitiveSearchAdapter } from "./bindings/search";
import { AzureSessionAdapter } from "./bindings/sessions";

export interface AzureFunctionsAdapterConfig {
  databaseUrl?: string;
  redisUrl?: string;
  storageBlobConnectionString?: string;
  containerName?: string;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
}

export class AzureFunctionsAdapter implements RuntimeAdapter {
  readonly name = "azure-functions";
  readonly type: RuntimeType = "serverless";
  private config: AzureFunctionsAdapterConfig;
  private localQueues = new Map<string, MemoryQueueBinding>();
  private pendingWork: Promise<unknown>[] = [];

  constructor(config?: AzureFunctionsAdapterConfig) {
    this.config = config || {};
  }
  async init(_context: unknown): Promise<void> {}
  getDatabase(): unknown {
    return this.config.databaseUrl || process.env.DATABASE_URL || null;
  }
  getCache(namespace?: string): CacheBinding {
    return new MemoryCacheBinding(namespace || "app");
  }
  getQueue<T = unknown>(name: string): QueueBinding<T> {
    if (!this.localQueues.has(name))
      this.localQueues.set(name, new MemoryQueueBinding(name));
    return this.localQueues.get(name) as unknown as QueueBinding<T>;
  }
  getLocalQueue<T = unknown>(name: string): LocalQueueLike<T> | null {
    return (this.localQueues.get(name) as unknown as LocalQueueLike<T>) ?? null;
  }
  getAI(): AIBinding | null {
    const k =
      this.config.openaiApiKey ||
      process.env.OPENAI_API_KEY ||
      process.env.AZURE_OPENAI_API_KEY;
    if (!k) return null;
    const base =
      this.config.openaiBaseUrl ||
      process.env.OPENAI_BASE_URL ||
      process.env.AZURE_OPENAI_ENDPOINT;
    return new OpenAICompatibleAIBinding(k, base);
  }
  getLogger(): AzureMonitorLogAdapter {
    return new AzureMonitorLogAdapter();
  }
  getRateLimiter(): AzureRedisRateLimitAdapter {
    return new AzureRedisRateLimitAdapter(this.config.redisUrl || process.env.REDIS_URL || process.env.AZURE_REDIS_URL || null);
  }
  getScheduler(): AzureBlobLeaseSchedulerAdapter {
    return new AzureBlobLeaseSchedulerAdapter(this.config.storageBlobConnectionString || process.env.AZURE_STORAGE_CONNECTION_STRING || null);
  }
  getBroadcast(): AzureBroadcastAdapter {
    return new AzureBroadcastAdapter(this.config.redisUrl || process.env.REDIS_URL || process.env.AZURE_REDIS_URL || null);
  }
  getSearch(): AzureCognitiveSearchAdapter {
    return new AzureCognitiveSearchAdapter(
      process.env.AZURE_SEARCH_ENDPOINT || null,
      process.env.AZURE_SEARCH_KEY || null,
    );
  }
  getSessionAdapter(): AzureSessionAdapter {
    return new AzureSessionAdapter(this.config.redisUrl || process.env.REDIS_URL || process.env.AZURE_REDIS_URL || null);
  }
  getBinding<T = unknown>(name: string): T | null {
    return (process.env[name] as unknown as T) ?? null;
  }
  getStorageBucket(): unknown | null {
    return (
      this.config.containerName || process.env.AZURE_CONTAINER_NAME || null
    );
  }
  waitUntil(promise: Promise<unknown>): void {
    this.pendingWork.push(promise);
  }
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
      hasStorage: !!this.getStorageBucket(),
      hasOpenAI: !!this.getAI(),
    };
  }
  clear(): void {
    this.localQueues.clear();
    this.pendingWork = [];
  }
}
