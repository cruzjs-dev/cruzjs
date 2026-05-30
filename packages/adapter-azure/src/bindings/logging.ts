/**
 * Azure Monitor / Application Insights Log Adapter
 *
 * Outputs structured JSON formatted for Azure Monitor ingestion.
 * Azure Functions and Container Apps capture structured logs
 * from stdout and forward to Application Insights.
 *
 * Uses the `customDimensions` pattern that Application Insights
 * recognizes for queryable properties in Kusto (KQL).
 */

import type { LogAdapterBinding } from '@cruzjs/core/runtime';

type AzureLogEntry = {
  level: string;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
  correlationId?: string;
  source?: string;
};

/** Map CruzJS log levels to Application Insights severity levels */
const AZURE_SEVERITY_MAP: Record<string, number> = {
  debug: 0,    // Verbose
  info: 1,     // Information
  warning: 2,  // Warning
  error: 3,    // Error
  critical: 4, // Critical
};

export class AzureMonitorLogAdapter implements LogAdapterBinding {
  async log(entry: AzureLogEntry): Promise<void> {
    const output: Record<string, unknown> = {
      timestamp: entry.timestamp,
      message: entry.message,
      severityLevel: AZURE_SEVERITY_MAP[entry.level] ?? 1,
      customDimensions: {
        level: entry.level,
        ...(entry.source ? { source: entry.source } : {}),
        ...(entry.correlationId ? { correlationId: entry.correlationId } : {}),
        ...(entry.context ?? {}),
      },
    };

    if (entry.correlationId) {
      output.operationId = entry.correlationId;
    }

    console.log(JSON.stringify(output));
  }

  async flush(): Promise<void> {
    // stdout-based — no buffering to flush
  }
}
