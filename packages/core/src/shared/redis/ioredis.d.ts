/**
 * Type declarations for ioredis module
 * This allows the dynamic import to type-check without requiring the package at compile time
 */
declare module 'ioredis' {
  import type { RedisClient, RedisOptions } from './redis.types';

  interface RedisConstructor {
    new (url: string, options?: RedisOptions): RedisClient;
  }

  const Redis: RedisConstructor;
  export default Redis;
  export type { Redis };
}
