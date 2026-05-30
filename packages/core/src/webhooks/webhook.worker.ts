/**
 * Webhook Delivery Job Handler
 *
 * Processes webhook delivery jobs from the queue.
 * Delegates to WebhookService.deliverWebhook for actual HTTP delivery.
 */

import { inject, injectable } from 'inversify';
import type { Job } from '../database/schema';
import type { JobHandler, JobHandlerMetadata, JobResult } from '../jobs/job.types';
import { WebhookService } from './webhook.service';

@injectable()
export class WebhookDeliveryJobHandler implements JobHandler {
  readonly metadata: JobHandlerMetadata = {
    jobType: 'webhook-delivery',
    statuses: ['PENDING'],
    description: 'Delivers outgoing webhook HTTP requests',
  };

  constructor(
    @inject(WebhookService) private readonly webhookService: WebhookService,
  ) {}

  async run(job: Job): Promise<JobResult> {
    const payload = job.payload as unknown as { deliveryId: string };
    const { deliveryId } = typeof payload === 'string' ? JSON.parse(payload) : payload;

    if (!deliveryId) {
      return {
        success: false,
        error: 'Missing deliveryId in job payload',
      };
    }

    const result = await this.webhookService.deliverWebhook(deliveryId);
    return {
      success: result.success,
      summary: {
        deliveryId,
        statusCode: result.statusCode,
        durationMs: result.durationMs,
        error: result.error,
      },
    };
  }
}
