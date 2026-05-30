import { injectable, inject } from 'inversify';
import { ConfigService } from '../config/config.service';
import type { RedisClient } from './redis.types';

// Module-level Redis client cache (persists across container rebuilds)
let sharedRedisClient: RedisClient | null = null;
let shutdownRegistered = false;
let initializationPromise: Promise<RedisClient> | null = null;

/**
 * Redis service for managing Redis connections
 * Uses a module-level singleton to persist connections across container rebuilds
 * Note: This service is for Node.js environments. For Cloudflare, use KVCacheService.
 */
@injectable()
export class RedisService {
  constructor(@inject(ConfigService) private readonly configService: ConfigService) {}

  /**
   * Get or create Redis client instance (module-level singleton)
   * Uses dynamic import to avoid requiring ioredis at build time
   */
  getClient(): RedisClient {
    if (sharedRedisClient) {
      return sharedRedisClient;
    }

    // Return a proxy that will initialize on first use
    // This is needed because inversify doesn't support async factories well
    throw new Error(
      'Redis client not initialized. Call initializeAsync() first or use getClientAsync().'
    );
  }

  /**
   * Get or create Redis client instance asynchronously
   * This is the preferred method for getting the client
   */
  async getClientAsync(): Promise<RedisClient> {
    if (sharedRedisClient) {
      return sharedRedisClient;
    }

    if (initializationPromise) {
      return initializationPromise;
    }

    initializationPromise = this.initializeClient();
    return initializationPromise;
  }

  /**
   * Initialize the Redis client
   */
  private async initializeClient(): Promise<RedisClient> {
    // Dynamic import to avoid requiring ioredis at build time.
    // @vite-ignore skips static analysis so Vite/Vitest doesn't fail if ioredis isn't installed.
    const { default: Redis } = await import(/* @vite-ignore */ 'ioredis').catch(() => {
      throw new Error('ioredis is not available in this environment. Use KVCacheService for Cloudflare.');
    });

    const redisUrl = this.configService.getOrThrow<string>('REDIS_URL');
    const connectTimeout = this.configService.get<number>('REDIS_CONNECT_TIMEOUT', 10000);

    const client = new Redis(redisUrl, {
      connectTimeout,
      retryStrategy: (times: number) => {
        // Exponential backoff: 50ms, 100ms, 200ms, 400ms, 800ms, 1600ms, max 3000ms
        const delay = Math.min(times * 50, 3000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      enableOfflineQueue: true,
    });

    // Connection event handlers
    client.on('connect', () => {
      console.log('Redis connected');
    });

    client.on('ready', () => {
      console.log('Redis ready');
    });

    client.on('error', (error: Error) => {
      console.error('Redis error:', error.message);
    });

    client.on('close', () => {
      console.log('Redis connection closed');
    });

    client.on('reconnecting', () => {
      console.log('Redis reconnecting...');
    });

    // Handle graceful shutdown (only register once)
    if (!shutdownRegistered && typeof process !== 'undefined') {
      shutdownRegistered = true;
      process.on('beforeExit', async () => {
        if (sharedRedisClient) {
          await sharedRedisClient.quit();
          sharedRedisClient = null;
        }
      });
    }

    sharedRedisClient = client;
    return client;
  }

  /**
   * Check if Redis is available in this environment
   */
  isAvailable(): boolean {
    try {
      this.configService.getOrThrow<string>('REDIS_URL');
      return true;
    } catch {
      return false;
    }
  }
}
