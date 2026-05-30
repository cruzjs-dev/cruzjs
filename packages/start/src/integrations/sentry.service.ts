import { Injectable, Inject } from '@cruzjs/core/di';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '@cruzjs/core/shared/database/drizzle.service';
import { IntegrationService } from './integration.service';
import type {
  SentryIntegrationConfig,
  SentryIssueEvent,
} from './integration.types';

/**
 * SentryService
 *
 * Handles Sentry integration: webhook signature verification and event ingestion.
 * Apps can extend this to handle Sentry events (e.g., auto-create issues).
 */
@Injectable()
export class SentryService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @Inject(IntegrationService) private readonly integrationService: IntegrationService,
  ) {}

  async testConnection(config: SentryIntegrationConfig): Promise<{ success: boolean; message: string }> {
    if (!config.webhookSecret) {
      return { success: false, message: 'Webhook secret is required' };
    }

    return {
      success: true,
      message: `Sentry webhook configured for ${config.organizationSlug}${config.projectSlug ? '/' + config.projectSlug : ''}. Awaiting webhook events.`,
    };
  }

  async verifySignature(
    body: string,
    signature: string,
    secret: string,
  ): Promise<boolean> {
    try {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
      );
      const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(body),
      );
      const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      return expectedSignature === signature;
    } catch {
      return false;
    }
  }

  async handleWebhookEvent(
    _connectionId: string,
    _orgId: string,
    _config: SentryIntegrationConfig,
    _event: SentryIssueEvent,
  ): Promise<{ workItemId: string | null; action: string }> {
    // Override in app-level service to handle Sentry events
    return { workItemId: null, action: 'ignored:no-handler' };
  }
}
