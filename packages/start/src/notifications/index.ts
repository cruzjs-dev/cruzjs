// Service
export { NotificationService } from './notification.service';

// Router
export { notificationTrpc } from './notification.trpc';

// Module
export { NotificationModule } from './notification.module';

// Base class & template
export { NotificationBase } from './notification.base';
export type {
  MailNotificationData,
  SmsNotificationData,
  PushNotificationData,
  SlackNotificationData,
  DatabaseNotificationData,
} from './notification.base';
export { NotificationTemplate } from './notification.template';

// Adapters
export { SMS_ADAPTER, type SmsAdapter } from './adapters/sms.adapter';

// Channels
export { SlackChannel } from './channels/slack.channel';
export { EmailChannel } from './channels/email.channel';
export { InAppChannel } from './channels/inapp.channel';
export { SmsChannel } from './channels/sms.channel';
export { PushChannel, type WebPushSubscription } from './channels/push.channel';
export { WebhookNotificationChannel } from './channels/webhook.channel';

// Types
export type {
  NotificationPayload,
  ChannelConfig,
  NotificationPreferenceSetting,
  GetNotificationsInput,
  MarkReadInput,
  ConfigureSlackInput,
  UpdateNotificationPreferenceInput,
  BulkUpdateNotificationPreferencesInput,
  SubscribePushInput,
  UnsubscribePushInput,
} from './notification.types';

export {
  GetNotificationsInputSchema,
  MarkReadInputSchema,
  ConfigureSlackInputSchema,
  UpdateNotificationPreferenceInputSchema,
  BulkUpdateNotificationPreferencesInputSchema,
  SubscribePushInputSchema,
  UnsubscribePushInputSchema,
} from './notification.types';

// Components
export * from './components';
