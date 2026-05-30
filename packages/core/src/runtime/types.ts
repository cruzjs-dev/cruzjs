/**
 * CruzJS Runtime Abstraction Types
 *
 * Provider-agnostic interfaces for all infrastructure concerns.
 * Each cloud provider adapter implements these interfaces.
 */

// ─── Cache Binding ──────────────────────────────────────────────────────────

export interface CacheBinding {
  get<T = string>(key: string): Promise<T | null>;
  set(key: string, value: string | number | object, ttlSeconds?: number): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  deleteMany(keys: string[]): Promise<number>;
  exists(key: string): Promise<boolean>;
  keys(pattern: string): Promise<string[]>;
  clear(): Promise<number>;
  increment(key: string, by?: number): Promise<number>;
  decrement(key: string, by?: number): Promise<number>;
}

// ─── Queue Binding ──────────────────────────────────────────────────────────

export interface QueueBinding<T = unknown> {
  send(message: T): Promise<void>;
  sendBatch(messages: { body: T }[]): Promise<void>;
}

export interface QueueConsumerMessage<T = unknown> {
  id: string;
  body: T;
  timestamp: Date;
  ack(): void;
  retry(options?: { delaySeconds?: number }): void;
}

// ─── AI Binding ─────────────────────────────────────────────────────────────

export interface AIBinding {
  chat(options: AIChatOptions): Promise<string | null>;
  embed(texts: string[], model?: string): Promise<number[][] | null>;
  describeImage(image: ArrayBuffer, prompt?: string): Promise<string | null>;
  analyzeSentiment(text: string): Promise<AISentimentResult | null>;
  extractStructured<T>(options: AIExtractOptions<T>): Promise<T | null>;
}

export interface AIChatOptions {
  prompt: string;
  system?: string;
  size?: 'small' | 'medium' | 'large';
  temperature?: number;
  maxTokens?: number;
}

export interface AISentimentResult {
  label: string;
  score: number;
}

export interface AIExtractOptions<T> {
  prompt: string;
  system: string;
  schema: { safeParse(data: unknown): { success: boolean; data?: T; error?: { issues: unknown[] } } };
  schemaName: string;
  size?: 'small' | 'medium' | 'large';
  temperature?: number;
  maxRetries?: number;
}

// ─── Log Adapter ───────────────────────────────────────────────────────────

/** Re-exported for convenience; canonical definition in @cruzjs/core/logging */
export interface LogAdapterBinding {
  log(entry: { level: string; message: string; context?: Record<string, unknown>; timestamp: string; correlationId?: string; source?: string }): Promise<void>;
  flush?(): Promise<void>;
}

// ─── Runtime Adapter ────────────────────────────────────────────────────────

export type RuntimeType = 'edge' | 'serverless' | 'container';

export interface RuntimeAdapter {
  readonly name: string;
  readonly type: RuntimeType;

  /** Initialize runtime-specific resources (DB connections, etc.) */
  init(context: unknown): Promise<void>;

  /**
   * One-time bootstrap hook. Called once before the first container build.
   * Use for expensive setup that should not repeat per request (e.g. connection pools).
   */
  bootstrap?(): Promise<void>;

  /**
   * Per-request binding hook. Called on every incoming request to bind
   * request-scoped resources (e.g. env bindings from the load context).
   * When provided, this is called instead of `init()` on subsequent requests.
   */
  bindRequest?(context: unknown): Promise<void>;

  /** Get the database connection (already initialized) */
  getDatabase(): unknown;

  /** Get a cache binding (with optional namespace prefix) */
  getCache(namespace?: string): CacheBinding;

  /** Get a queue binding by name */
  getQueue<T = unknown>(name: string): QueueBinding<T>;

  /** Get a local/dev queue for consumer registration (null in production) */
  getLocalQueue<T = unknown>(name: string): LocalQueueLike<T> | null;

  /** Get the AI binding (null if not configured) */
  getAI(): AIBinding | null;

  /** Get the platform-specific log adapter (null if not configured) */
  getLogger?(): LogAdapterBinding | null;

  /** Get a raw platform-specific binding by name */
  getBinding<T = unknown>(name: string): T | null;

  /** Get the R2/storage bucket binding (raw, for StorageService) */
  getStorageBucket(): unknown | null;

  /** Run background work after response (fire-and-forget on containers, must-await on serverless) */
  waitUntil(promise: Promise<unknown>): void;

  /** Get all platform environment variables */
  get env(): Record<string, string | undefined>;

  /** Diagnostic info */
  get diagnostics(): Record<string, unknown>;

  /** Get the rate limiter adapter (null if not configured) */
  getRateLimiter?(): import('../rate-limiting/rate-limit.adapter').RateLimitAdapter | null;

  /** Get the scheduler adapter for distributed locking (null if not configured) */
  getScheduler?(): import('../scheduler/scheduler.adapter').SchedulerAdapter | null;

  /** Get the broadcast adapter for real-time event delivery (null if not configured) */
  getBroadcast?(): import('../broadcasting/broadcast.adapter').BroadcastAdapter | null;

  /** Get the SSE backend for message delivery (null = use InMemorySSEBackend default) */
  getSSEBackend?(): import('../broadcasting/sse-backend').SSEBackend | null;

  /** Get the search adapter for full-text search (null if not configured) */
  getSearch?(): import('../search/search.adapter').SearchAdapter | null;

  /** Get the session adapter for session storage (null if not configured) */
  getSessionAdapter?(): import('../sessions/session.adapter').SessionAdapter | null;

  /** Get the image processor for image transformations (null if not configured) */
  getImageProcessor?(): import('../image/image.interface').IImageProcessor | null;

  /** Get the PDF generator for HTML-to-PDF conversion (null if not configured) */
  getPdfGenerator?(): import('../pdf/pdf.interface').IPdfGenerator | null;

  /** Clear state (for testing) */
  clear(): void;
}

/** Minimal local queue interface for dev consumer registration */
export interface LocalQueueLike<T = unknown> {
  onMessage(callback: (message: T) => Promise<void>): void;
}
