/**
 * Cloudflare Log Adapter
 *
 * Outputs structured JSON logs for Cloudflare Logpush consumption.
 * Console output is the primary channel on Workers/Pages; Logpush
 * captures structured console output and forwards to configured sinks.
 */

import type { LogAdapterBinding } from '@cruzjs/core/runtime';

type CloudflareLogEntry = {
  level: string;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
  correlationId?: string;
  source?: string;
};

export class CloudflareLogAdapter implements LogAdapterBinding {
  async log(entry: CloudflareLogEntry): Promise<void> {
    // Cloudflare Workers capture console output as structured logs.
    // Logpush picks up JSON lines from stdout automatically.
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

    // Single JSON line per entry — Logpush parses these natively
    console.log(JSON.stringify(output));
  }

  async flush(): Promise<void> {
    // Console-based — no buffering to flush
  }
}
