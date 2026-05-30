import { Module } from '@cruzjs/core/di';
import { NotificationService } from './notification.service';
import { SlackChannel } from './channels/slack.channel';
import { EmailChannel } from './channels/email.channel';
import { InAppChannel } from './channels/inapp.channel';
import { SmsChannel } from './channels/sms.channel';
import { PushChannel } from './channels/push.channel';
import { WebhookNotificationChannel } from './channels/webhook.channel';
import { SMS_ADAPTER } from './adapters/sms.adapter';
import { notificationTrpc } from './notification.trpc';

/**
 * Notification Module
 *
 * Registers NotificationService, all channel implementations, and the notification tRPC router.
 *
 * SMS_ADAPTER is registered as an optional null binding so SmsChannel can be injected
 * even when no SMS provider is configured. To enable SMS, bind a real SmsAdapter
 * implementation in your app module:
 *
 * ```typescript
 * @Module({
 *   providers: [
 *     { provide: SMS_ADAPTER, useClass: TwilioSmsAdapter },
 *   ],
 * })
 * ```
 */
@Module({
  providers: [
    NotificationService,
    SlackChannel,
    EmailChannel,
    InAppChannel,
    SmsChannel,
    PushChannel,
    WebhookNotificationChannel,
    { provide: SMS_ADAPTER, useValue: null },
  ],
  trpcRouters: {
    notification: notificationTrpc,
  },
})
export class NotificationModule {}
