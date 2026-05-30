/**
 * Webhooks
 *
 * Outgoing webhook dispatch + delivery with HMAC-SHA256 signing, retry logic,
 * and incoming webhook verification.
 */

// Types
export type {
  WebhookStatus,
  WebhookEventType,
  WebhookPayload,
  WebhookDeliveryResult,
} from './webhook.types';
export {
  WEBHOOK_RETRY_DELAYS_MS,
  MAX_WEBHOOK_ATTEMPTS,
  RETRY_JITTER_FACTOR,
  getRetryDelayMs,
} from './webhook.types';

// Schema
export {
  webhooks,
  webhookDeliveries,
  webhooksRelations,
  webhookDeliveriesRelations,
} from './webhook.schema';
export type {
  Webhook,
  NewWebhook,
  WebhookDelivery,
  NewWebhookDelivery,
} from './webhook.schema';

// Validation
export {
  createWebhookSchema,
  updateWebhookSchema,
} from './webhook.validation';
export type {
  CreateWebhookInput,
  UpdateWebhookInput,
} from './webhook.validation';

// Service
export { WebhookService } from './webhook.service';

// Signer
export { signPayload, verifySignature, generateSecret } from './webhook.signer';

// Verifier
export { verifyWebhookRequest } from './webhook.verifier';

// Worker
export { WebhookDeliveryJobHandler } from './webhook.worker';

// tRPC
export { WebhookTrpc } from './webhook.trpc';

// Module
export { WebhookModule } from './webhook.module';
