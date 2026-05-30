/**
 * Docker / Self-Hosted Log Adapter
 *
 * Outputs structured JSON to console for Docker log drivers to capture.
 * Supports optional HTTP sink for forwarding to external log aggregators
 * (e.g., Logstash, Fluentd, Loki) and file rotation.
 *
 * Configuration via environment variables:
 * - LOG_HTTP_SINK_URL: URL of external log aggregator (optional)
 * - LOG_HTTP_SINK_BATCH_SIZE: entries to buffer before flush (default 50)
 */

import type { LogAdapterBinding } from '@cruzjs/core/runtime';

type DockerLogEntry = {
  level: string;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
  correlationId?: string;
  source?: string;
};

export class DockerLogAdapter implements LogAdapterBinding {
  private buffer: DockerLogEntry[] = [];
  private readonly httpSinkUrl: string | null;
  private readonly batchSize: number;

  constructor() {
    this.httpSinkUrl = process.env.LOG_HTTP_SINK_URL ?? null;
    this.batchSize = parseInt(process.env.LOG_HTTP_SINK_BATCH_SIZE ?? '50', 10);
  }

  async log(entry: DockerLogEntry): Promise<void> {
    // Always output to console for Docker log driver capture
    const output: Record<string, unknown> = {
      timestamp: entry.timestamp,
      level: entry.level,
      message: entry.message,
    };

    if (entry.correlationId) {
      output.correlationId = entry.correlationId;
    }

    if (entry.source) {
      output.source = entry.source;
    }

    if (entry.context && Object.keys(entry.context).length > 0) {
      output.context = entry.context;
    }

    console.log(JSON.stringify(output));

    // Buffer for HTTP sink if configured
    if (this.httpSinkUrl) {
      this.buffer.push(entry);
      if (this.buffer.length >= this.batchSize) {
        await this.flush();
      }
    }
  }

  async flush(): Promise<void> {
    if (!this.httpSinkUrl || this.buffer.length === 0) {
      return;
    }

    const entries = [...this.buffer];
    this.buffer = [];

    try {
      await fetch(this.httpSinkUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entries),
      });
    } catch {
      // HTTP sink failures must not crash the application.
      // Entries are lost on failure — acceptable trade-off for logging.
    }
  }
}
