/**
 * Webhook Types
 *
 * Core types for the webhook delivery system.
 */

export type WebhookStatus = 'pending' | 'success' | 'failed';

export type WebhookEventType = string;

export type WebhookPayload = {
  id: string;
  event: string;
  timestamp: string;
  data: unknown;
};

export type WebhookDeliveryResult = {
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  error?: string;
  durationMs: number;
};

/**
 * Retry delays in milliseconds for failed webhook deliveries.
 * Exponential backoff: 30s, 5min, 30min, 2h, 8h
 */
export const WEBHOOK_RETRY_DELAYS_MS = [
  30_000,       // 30 seconds
  300_000,      // 5 minutes
  1_800_000,    // 30 minutes
  7_200_000,    // 2 hours
  28_800_000,   // 8 hours
] as const;

export const MAX_WEBHOOK_ATTEMPTS = 5;

/**
 * Jitter factor for retry delays (0-1). Adds up to this fraction of the delay as random jitter.
 */
export const RETRY_JITTER_FACTOR = 0.1;

/**
 * Compute the retry delay for a given attempt with jitter.
 * @param attempt - Zero-based attempt number (0 = first retry after initial failure)
 */
export function getRetryDelayMs(attempt: number): number {
  const baseDelay = WEBHOOK_RETRY_DELAYS_MS[Math.min(attempt, WEBHOOK_RETRY_DELAYS_MS.length - 1)];
  const jitter = baseDelay * RETRY_JITTER_FACTOR * Math.random();
  return baseDelay + jitter;
}
