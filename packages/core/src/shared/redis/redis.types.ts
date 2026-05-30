/**
 * Redis client interface
 * Compatible with ioredis but can be replaced with other implementations
 */
export interface RedisClient {
  // Basic operations
  get(key: string): Promise<string | null>;
  set(key: string, value: string | number | Buffer): Promise<string>;
  setex(key: string, seconds: number, value: string | number | Buffer): Promise<string>;
  del(...keys: string[]): Promise<number>;
  exists(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  incrby(key: string, increment: number): Promise<number>;
  decrby(key: string, decrement: number): Promise<number>;
  keys(pattern: string): Promise<string[]>;

  // Set operations (used for tagged cache invalidation)
  sadd(key: string, ...members: string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;

  // Connection management
  quit(): Promise<string>;
  ping(): Promise<string>;

  // Connection status (ioredis specific)
  status?: string;

  // Event emitter methods
  on(event: string, listener: (...args: unknown[]) => void): void;
  once(event: string, listener: (...args: unknown[]) => void): void;
  removeListener(event: string, listener: (...args: unknown[]) => void): void;
}

/**
 * Redis constructor options
 */
export interface RedisOptions {
  connectTimeout?: number;
  retryStrategy?: (times: number) => number | void | null;
  maxRetriesPerRequest?: number;
  enableReadyCheck?: boolean;
  enableOfflineQueue?: boolean;
}
