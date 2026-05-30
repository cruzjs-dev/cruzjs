/**
 * AWS CloudWatch Log Adapter
 *
 * Outputs structured JSON suitable for CloudWatch Logs ingestion.
 * Lambda automatically captures stdout/stderr and sends to CloudWatch.
 * The structured format enables CloudWatch Insights queries.
 */

import type { LogAdapterBinding } from '@cruzjs/core/runtime';

type AWSLogEntry = {
  level: string;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
  correlationId?: string;
  source?: string;
};

export class AWSCloudWatchLogAdapter implements LogAdapterBinding {
  async log(entry: AWSLogEntry): Promise<void> {
    // CloudWatch Embedded Metric Format (EMF) compatible structure.
    // Lambda captures JSON lines from stdout and indexes them in CloudWatch Insights.
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

    // AWS Lambda runtime forwards JSON stdout to CloudWatch Logs
    console.log(JSON.stringify(output));
  }

  async flush(): Promise<void> {
    // stdout-based — no buffering to flush
  }
}
