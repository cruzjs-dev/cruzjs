import { injectable, inject } from 'inversify';
import { ConfigService } from '../config/config.service';

/**
 * Standard metric units
 */
export enum MetricUnit {
  Count = 'Count',
  Milliseconds = 'Milliseconds',
  Bytes = 'Bytes',
  Percent = 'Percent',
}

type MetricEntry = {
  name: string;
  value: number;
  unit: MetricUnit;
  timestamp: Date;
  dimensions?: Record<string, string>;
};

/**
 * Metrics service for tracking application metrics
 *
 * This implementation logs metrics to console and can be extended
 * to send metrics to external services like:
 * - Cloudflare Analytics Engine
 * - Prometheus/Grafana
 * - Custom analytics endpoints
 */
@injectable()
export class MetricsService {
  private readonly namespace: string;
  private metricBuffer: MetricEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly enabled: boolean;

  constructor(
    @inject(ConfigService) private readonly configService: ConfigService
  ) {
    this.namespace = this.configService.get<string>('METRICS_NAMESPACE', 'Aurora') ?? 'Aurora';
    this.enabled = this.configService.get<boolean>('METRICS_ENABLED', false) ?? false;

    if (this.enabled) {
      // Flush metrics every 60 seconds
      this.flushInterval = setInterval(() => {
        this.flush().catch((error) => {
          console.error('[Metrics] Failed to flush metrics:', error);
        });
      }, 60000);
    }
  }

  /**
   * Record a metric
   */
  recordMetric(
    metricName: string,
    value: number,
    unit: MetricUnit = MetricUnit.Count,
    dimensions?: Record<string, string>
  ): void {
    if (!this.enabled) return;

    this.metricBuffer.push({
      name: metricName,
      value,
      unit,
      timestamp: new Date(),
      dimensions,
    });

    // Flush if buffer is large
    if (this.metricBuffer.length >= 20) {
      this.flush().catch((error) => {
        console.error('[Metrics] Failed to flush metrics:', error);
      });
    }
  }

  /**
   * Record request duration
   */
  recordRequestDuration(method: string, path: string, durationMs: number): void {
    this.recordMetric('RequestDuration', durationMs, MetricUnit.Milliseconds, {
      method,
      path,
    });
  }

  /**
   * Record database query duration
   */
  recordDatabaseDuration(operation: string, durationMs: number): void {
    this.recordMetric('DatabaseDuration', durationMs, MetricUnit.Milliseconds, {
      operation,
    });
  }

  /**
   * Record job processing time
   */
  recordJobDuration(jobType: string, durationMs: number): void {
    this.recordMetric('JobDuration', durationMs, MetricUnit.Milliseconds, {
      jobType,
    });
  }

  /**
   * Increment counter
   */
  incrementCounter(metricName: string, dimensions?: Record<string, string>): void {
    this.recordMetric(metricName, 1, MetricUnit.Count, dimensions);
  }

  /**
   * Record error
   */
  recordError(errorType: string, path?: string): void {
    this.recordMetric('ErrorCount', 1, MetricUnit.Count, {
      errorType,
      ...(path && { path }),
    });
  }

  /**
   * Flush metrics (logs to console in this implementation)
   * Can be extended to send to external analytics services
   */
  async flush(): Promise<void> {
    if (this.metricBuffer.length === 0) {
      return;
    }

    try {
      // Log metrics summary
      const summary = this.metricBuffer.reduce((acc, metric) => {
        const key = metric.name;
        if (!acc[key]) {
          acc[key] = { count: 0, total: 0 };
        }
        acc[key].count++;
        acc[key].total += metric.value;
        return acc;
      }, {} as Record<string, { count: number; total: number }>);

      console.log(`[Metrics] ${this.namespace} flush:`, JSON.stringify(summary));

      // Clear buffer after successful flush
      this.metricBuffer = [];
    } catch (error) {
      console.error('[Metrics] Failed to flush metrics:', error);
    }
  }

  /**
   * Shutdown and flush remaining metrics
   */
  async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    await this.flush();
  }
}
