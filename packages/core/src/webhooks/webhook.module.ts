/**
 * Webhook Module
 *
 * Provides webhook registration, dispatch, delivery, and retry infrastructure.
 */

import { Module } from '../di';
import { JOB_HANDLER } from '../jobs/job.module';
import { WebhookService } from './webhook.service';
import { WebhookTrpc } from './webhook.trpc';
import { WebhookDeliveryJobHandler } from './webhook.worker';

@Module({
  providers: [
    WebhookService,
    WebhookTrpc,
    { provide: JOB_HANDLER, useClass: WebhookDeliveryJobHandler, multi: true },
  ],
  trpcRouters: {
    webhook: WebhookTrpc,
  },
})
export class WebhookModule {}
