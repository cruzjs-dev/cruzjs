/**
 * Webhook Service
 *
 * Manages webhook registration, dispatch, delivery, and retry logic.
 * Org-scoped: all queries filter by orgId.
 */

import { Injectable, Inject } from '../di';
import {
  DRIZZLE,
  type DrizzleDatabase,
} from '../shared/database/drizzle.service';
import { HttpClient } from '../http-client/http-client.service';
import { JobService } from '../jobs/job.service';
import { eq, and, desc } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { webhooks, webhookDeliveries } from './webhook.schema';
import type { Webhook, WebhookDelivery } from './webhook.schema';
import type { CreateWebhookInput, UpdateWebhookInput } from './webhook.validation';
import type { WebhookPayload, WebhookDeliveryResult, WebhookStatus } from './webhook.types';
import { MAX_WEBHOOK_ATTEMPTS, getRetryDelayMs } from './webhook.types';
import { signPayload, generateSecret, verifySignature } from './webhook.signer';

@Injectable()
export class WebhookService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @Inject(HttpClient) private readonly http: HttpClient,
    @Inject(JobService) private readonly jobService: JobService,
  ) {}

  // ── CRUD ────────────────────────────────────────────────────────────

  async create(orgId: string, userId: string, input: CreateWebhookInput): Promise<Webhook> {
    const secret = generateSecret();
    const [webhook] = await this.db
      .insert(webhooks)
      .values({
        orgId,
        createdById: userId,
        url: input.url,
        secret,
        events: JSON.stringify(input.events),
        description: input.description,
      })
      .returning();
    return webhook;
  }

  async list(orgId: string): Promise<Webhook[]> {
    return this.db
      .select()
      .from(webhooks)
      .where(eq(webhooks.orgId, orgId))
      .orderBy(desc(webhooks.createdAt));
  }

  async get(orgId: string, id: string): Promise<Webhook | null> {
    const [webhook] = await this.db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.id, id), eq(webhooks.orgId, orgId)))
      .limit(1);
    return webhook ?? null;
  }

  async update(orgId: string, id: string, input: UpdateWebhookInput): Promise<Webhook> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (input.url !== undefined) updateData.url = input.url;
    if (input.events !== undefined) updateData.events = JSON.stringify(input.events);
    if (input.description !== undefined) updateData.description = input.description;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    const [webhook] = await this.db
      .update(webhooks)
      .set(updateData)
      .where(and(eq(webhooks.id, id), eq(webhooks.orgId, orgId)))
      .returning();

    return webhook;
  }

  async delete(orgId: string, id: string): Promise<void> {
    await this.db
      .delete(webhooks)
      .where(and(eq(webhooks.id, id), eq(webhooks.orgId, orgId)));
  }

  // ── Dispatch ────────────────────────────────────────────────────────

  /**
   * Dispatch a webhook event to all matching active webhooks for the org.
   * Creates delivery records and enqueues jobs for async delivery.
   * Fire-and-forget: does not await delivery.
   */
  async dispatch(orgId: string, eventType: string, data: unknown): Promise<void> {
    const activeWebhooks = await this.db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.orgId, orgId), eq(webhooks.isActive, true)));

    const matchingWebhooks = activeWebhooks.filter((wh) => {
      const events = this.parseEvents(wh.events);
      return events.includes('*') || events.includes(eventType);
    });

    if (matchingWebhooks.length === 0) return;

    // Create delivery records for each matching webhook
    const deliveryValues = matchingWebhooks.map((wh) => {
      const payload: WebhookPayload = {
        id: createId(),
        event: eventType,
        timestamp: new Date().toISOString(),
        data,
      };

      return {
        webhookId: wh.id,
        eventType,
        payload: JSON.stringify(payload),
        status: 'pending' as const,
      };
    });

    const deliveries = await this.db
      .insert(webhookDeliveries)
      .values(deliveryValues)
      .returning();

    // Enqueue jobs for each delivery (fire-and-forget)
    for (const delivery of deliveries) {
      await this.jobService.createJob({
        type: 'webhook-delivery',
        payload: { deliveryId: delivery.id },
        lookupKey: `webhook:${delivery.webhookId}`,
      });
    }
  }

  // ── Delivery ────────────────────────────────────────────────────────

  /**
   * Deliver a single webhook. Called by the job handler.
   * Sends the HTTP request, records the result, and schedules retry if needed.
   */
  async deliverWebhook(deliveryId: string): Promise<WebhookDeliveryResult> {
    const [delivery] = await this.db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.id, deliveryId))
      .limit(1);

    if (!delivery) {
      return { success: false, error: 'Delivery not found', durationMs: 0 };
    }

    const [webhook] = await this.db
      .select()
      .from(webhooks)
      .where(eq(webhooks.id, delivery.webhookId))
      .limit(1);

    if (!webhook) {
      return { success: false, error: 'Webhook not found', durationMs: 0 };
    }

    const payloadStr = typeof delivery.payload === 'string'
      ? delivery.payload
      : JSON.stringify(delivery.payload);
    const signature = await signPayload(payloadStr, webhook.secret);
    const now = new Date().toISOString();
    const startTime = Date.now();

    let result: WebhookDeliveryResult;

    try {
      const response = await this.http
        .post(webhook.url, JSON.parse(payloadStr))
        .withHeaders({
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': delivery.eventType,
          'User-Agent': 'CruzJS-Webhooks/1.0',
        })
        .timeout(30_000)
        .send();

      const durationMs = Date.now() - startTime;
      const responseBody = await response.text();
      const success = response.ok;

      result = {
        success,
        statusCode: response.status,
        responseBody: responseBody.substring(0, 4096), // Limit stored response
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      result = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs,
      };
    }

    const newAttempts = (delivery.attempts ?? 0) + 1;
    const updateData: Record<string, unknown> = {
      attempts: newAttempts,
      lastAttemptAt: now,
      durationMs: result.durationMs,
    };

    if (result.success) {
      updateData.status = 'success';
      updateData.statusCode = result.statusCode;
      updateData.responseBody = result.responseBody;
    } else {
      updateData.error = result.error ?? `HTTP ${result.statusCode}`;
      updateData.statusCode = result.statusCode;
      updateData.responseBody = result.responseBody;

      if (newAttempts < MAX_WEBHOOK_ATTEMPTS) {
        // Schedule retry
        const retryDelay = getRetryDelayMs(newAttempts - 1);
        const nextRetryAt = new Date(Date.now() + retryDelay).toISOString();
        updateData.nextRetryAt = nextRetryAt;
        updateData.status = 'pending';

        // Enqueue retry job
        await this.jobService.createJob({
          type: 'webhook-delivery',
          payload: { deliveryId: delivery.id },
          lookupKey: `webhook:${delivery.webhookId}`,
          scheduledFor: new Date(Date.now() + retryDelay),
        });
      } else {
        updateData.status = 'failed';
      }
    }

    await this.db
      .update(webhookDeliveries)
      .set(updateData)
      .where(eq(webhookDeliveries.id, deliveryId));

    return result;
  }

  // ── Deliveries ──────────────────────────────────────────────────────

  async listDeliveries(
    orgId: string,
    webhookId: string,
    options?: { limit?: number; status?: WebhookStatus },
  ): Promise<WebhookDelivery[]> {
    // Verify webhook belongs to org
    const webhook = await this.get(orgId, webhookId);
    if (!webhook) return [];

    const conditions = [eq(webhookDeliveries.webhookId, webhookId)];
    if (options?.status) {
      conditions.push(eq(webhookDeliveries.status, options.status));
    }

    return this.db
      .select()
      .from(webhookDeliveries)
      .where(and(...conditions))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(options?.limit ?? 20);
  }

  async redeliver(orgId: string, deliveryId: string): Promise<void> {
    // Fetch delivery and verify it belongs to an org webhook
    const [delivery] = await this.db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.id, deliveryId))
      .limit(1);

    if (!delivery) return;

    const webhook = await this.get(orgId, delivery.webhookId);
    if (!webhook) return;

    // Reset delivery for re-attempt
    await this.db
      .update(webhookDeliveries)
      .set({
        status: 'pending',
        attempts: 0,
        error: null,
        statusCode: null,
        responseBody: null,
        durationMs: null,
        lastAttemptAt: null,
        nextRetryAt: null,
      })
      .where(eq(webhookDeliveries.id, deliveryId));

    await this.jobService.createJob({
      type: 'webhook-delivery',
      payload: { deliveryId },
      lookupKey: `webhook:${webhook.id}`,
    });
  }

  // ── Incoming verification ───────────────────────────────────────────

  async verifyIncoming(payload: string, signature: string, secret: string): Promise<boolean> {
    return verifySignature(payload, signature, secret);
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  private parseEvents(events: string): string[] {
    try {
      const parsed = JSON.parse(events);
      return Array.isArray(parsed) ? parsed : ['*'];
    } catch {
      return ['*'];
    }
  }
}
