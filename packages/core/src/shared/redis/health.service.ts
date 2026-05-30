import { injectable, inject } from 'inversify';
import { RedisService } from './redis.service';

export type RedisHealthStatus = {
  status: 'healthy' | 'unhealthy' | 'unavailable';
  latency?: number;
  error?: string;
};

/**
 * Redis health service
 */
@injectable()
export class RedisHealthService {
  constructor(@inject(RedisService) private readonly redisService: RedisService) {}

  /**
   * Check Redis connection health
   * Returns status with latency measurement
   */
  async checkHealth(timeoutMs = 5000): Promise<RedisHealthStatus> {
    // Check if Redis is configured
    if (!this.redisService.isAvailable()) {
      return {
        status: 'unavailable',
        error: 'Redis not configured',
      };
    }

    const startTime = Date.now();

    try {
      const redis = await this.redisService.getClientAsync();

      // Use Promise.race to add timeout
      const pingPromise = redis.ping();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('Redis health check timeout')),
          timeoutMs
        );
      });

      await Promise.race([pingPromise, timeoutPromise]);

      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        latency,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
