# Notifications

CruzJS provides a multi-channel notification system through `NotificationModule`, which is included in `StartModule`.

## Overview

Notifications can be delivered through six channels:

| Channel | Description | Requires |
|---------|-------------|----------|
| In-app | Stored notifications with read/unread state | Database (built-in) |
| Email | Email delivery via configured email service | Email service |
| Slack | Slack webhook delivery | Slack webhook URL |
| Push | Web Push via VAPID | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` env vars |
| SMS | SMS delivery via adapter | SMS adapter (e.g. Twilio) |
| Webhook | HTTP POST to user-configured URLs | Webhook URLs |

## NotificationBase

All notifications extend the `NotificationBase` abstract class. Each channel has an optional method -- implement only the channels you want to use:

```typescript
import { NotificationBase } from '@cruzjs/start/notifications';

export class OrderConfirmationNotification extends NotificationBase {
  constructor(
    private readonly order: { id: string; total: number; customerName: string },
  ) {
    super();
  }

  // In-app notification (stored in database)
  toInApp() {
    return {
      title: 'Order Confirmed',
      body: `Order #${this.order.id} for $${this.order.total} has been confirmed.`,
      actionUrl: `/orders/${this.order.id}`,
    };
  }

  // Email notification
  toEmail() {
    return {
      subject: `Order #${this.order.id} Confirmed`,
      html: `<p>Hi ${this.order.customerName}, your order has been confirmed.</p>`,
    };
  }

  // Push notification (Web Push)
  toPush() {
    return {
      title: 'Order Confirmed',
      body: `Order #${this.order.id} is confirmed.`,
      icon: '/icons/order.png',
      url: `/orders/${this.order.id}`,
    };
  }

  // SMS notification
  toSms() {
    return {
      body: `Order #${this.order.id} confirmed. Total: $${this.order.total}`,
    };
  }

  // Webhook payload
  toWebhook() {
    return {
      event: 'order.confirmed',
      data: { orderId: this.order.id, total: this.order.total },
    };
  }

  // Slack message
  toSlack() {
    return {
      text: `New order #${this.order.id} confirmed ($${this.order.total})`,
    };
  }
}
```

## Push Notifications (Web Push / VAPID)

Push notifications use the Web Push protocol with VAPID (Voluntary Application Server Identification).

### Configuration

Set these environment variables:

```
VAPID_PUBLIC_KEY=BN...your-public-key
VAPID_PRIVATE_KEY=...your-private-key
```

Generate VAPID keys using the `web-push` CLI:

```bash
npx web-push generate-vapid-keys
```

### Client-Side Setup

1. Get the VAPID public key:

```typescript
const { data } = trpc.notification.getPushKey.useQuery();
// data.vapidPublicKey -- use to subscribe the browser
```

2. Subscribe to push notifications:

```typescript
// After getting browser PushSubscription via the Push API
const subscribe = trpc.notification.subscribePush.useMutation();
await subscribe.mutateAsync({
  endpoint: subscription.endpoint,
  keys: {
    p256dh: subscription.toJSON().keys!.p256dh,
    auth: subscription.toJSON().keys!.auth,
  },
});
```

3. Unsubscribe:

```typescript
const unsubscribe = trpc.notification.unsubscribePush.useMutation();
await unsubscribe.mutateAsync({ endpoint: subscription.endpoint });
```

### Push Channel Implementation

The `PushChannel` (`channels/push.channel.ts`) uses VAPID credentials to send Web Push messages to subscribed browsers. Subscriptions are stored server-side and looked up per-user when sending.

## SMS Notifications

SMS delivery uses an SMS adapter. The default implementation is `TwilioSMSAdapter`.

### SMS Adapter Interface

```typescript
interface SMSAdapter {
  send(to: string, body: string): Promise<void>;
}
```

### Configuration

Configure via environment variables for Twilio:

```
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1234567890
```

The SMS adapter is provided by the runtime adapter's `TwoFactorAdapter` binding or can be registered separately.

## Webhook Channel

The webhook channel sends HTTP POST requests to user-configured webhook URLs when notifications are dispatched.

```typescript
toWebhook() {
  return {
    event: 'order.confirmed',
    data: { orderId: '123', total: 99.99 },
  };
}
```

The payload is sent as JSON with appropriate headers. Failed deliveries can be retried based on configuration.

## Per-User Notification Preferences

Users can control which channels they receive notifications on.

### Update a Single Preference

```typescript
const updatePref = trpc.notification.updatePreference.useMutation();
await updatePref.mutateAsync({
  channel: 'push',
  enabled: false,
});
```

### Bulk Update Preferences

```typescript
const bulkUpdate = trpc.notification.bulkUpdatePreferences.useMutation();
await bulkUpdate.mutateAsync({
  preferences: [
    { channel: 'push', enabled: true },
    { channel: 'email', enabled: true },
    { channel: 'sms', enabled: false },
  ],
});
```

## tRPC Procedures

| Procedure | Auth | Description |
|-----------|------|-------------|
| `notification.getPushKey` | Public | Returns VAPID public key |
| `notification.subscribePush` | Protected | Register a push subscription |
| `notification.unsubscribePush` | Protected | Remove a push subscription |
| `notification.updatePreference` | Protected | Update per-channel preference |
| `notification.bulkUpdatePreferences` | Protected | Bulk update channel preferences |

These are in addition to existing notification procedures (list, markRead, etc.) that were already part of `NotificationModule`.

## Sending Notifications

```typescript
import { NotificationService } from '@cruzjs/start/notifications';

@Injectable()
export class OrderService {
  constructor(private readonly notifications: NotificationService) {}

  async confirmOrder(order: Order) {
    // ... business logic ...

    // Send notification to the customer across all enabled channels
    await this.notifications.send(
      order.userId,
      new OrderConfirmationNotification(order),
    );
  }
}
```

The `NotificationService` checks the user's channel preferences and only delivers to enabled channels. If a notification class does not implement a channel method (e.g. `toSms()` is not defined), that channel is skipped regardless of preferences.

## Module Registration

`NotificationModule` is included in `StartModule`, so no separate registration is needed:

```typescript
// src/app.server.ts
import { DrizzleService } from '@cruzjs/core/shared/database/drizzle.service';
import { registerModules } from '@cruzjs/core/framework/module-registry';
import { StartModule } from '@cruzjs/start/start.module';
import * as schema from './database/schema';

DrizzleService.setSchema(schema);

registerModules([StartModule]);
```
