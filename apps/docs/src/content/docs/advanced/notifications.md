---
title: Notifications
description: Multi-channel notifications (in-app, email, Slack, push, SMS, webhook) with per-user preferences in CruzJS
---

CruzJS ships a multi-channel notification system that routes messages to the right destination based on per-user preferences. Six channels are supported out of the box: in-app, email, Slack, Web Push, SMS, and webhook.

## Setup

The `NotificationModule` is included in `StartModule`, so it is available automatically if you use `StartModule`:

```typescript
// src/app.server.ts
import { registerModules } from '@cruzjs/core/framework/module-registry';
import { StartModule } from '@cruzjs/start/start.module';

registerModules([StartModule]);
```

## Creating a Notification

Extend the `NotificationBase` abstract class. Implement `toInApp()` at minimum, and add other channel methods as needed:

```typescript
import { NotificationBase } from '@cruzjs/start/notifications';

export class InvoicePaidNotification extends NotificationBase {
  constructor(
    public readonly userId: string,
    public readonly invoiceId: string,
    public readonly amount: number,
  ) {
    super(userId);
  }

  toInApp() {
    return {
      title: 'Invoice Paid',
      body: `Invoice #${this.invoiceId} for $${this.amount} has been paid.`,
      url: `/invoices/${this.invoiceId}`,
    };
  }

  toEmail() {
    return {
      subject: 'Invoice Paid',
      html: `<p>Invoice #${this.invoiceId} for $${this.amount} has been paid.</p>`,
    };
  }

  toSlack() {
    return {
      text: `Invoice #${this.invoiceId} paid — $${this.amount}`,
    };
  }

  toPush() {
    return {
      title: 'Invoice Paid',
      body: `$${this.amount} received`,
      url: `/invoices/${this.invoiceId}`,
    };
  }

  toSms() {
    return {
      body: `Invoice #${this.invoiceId} paid: $${this.amount}`,
    };
  }

  toWebhook() {
    return {
      event: 'invoice.paid',
      data: { invoiceId: this.invoiceId, amount: this.amount },
    };
  }
}
```

Each `to*()` method is optional except `toInApp()`. If a method is not implemented, that channel is skipped for the notification.

## Sending Notifications

Inject `NotificationService` and call `send()`:

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { NotificationService } from '@cruzjs/start/notifications';

@Injectable()
export class InvoiceService {
  constructor(
    @Inject(NotificationService) private readonly notifications: NotificationService,
  ) {}

  async markPaid(invoiceId: string, userId: string, amount: number) {
    // ... update invoice ...

    await this.notifications.send(
      new InvoicePaidNotification(userId, invoiceId, amount),
    );
  }
}
```

The `send()` method routes to each configured channel based on:
1. Whether the notification class implements the channel method
2. The user's per-channel preferences (opt-out model)

## Channels

### In-App

Always available. Notifications are stored in the database and surfaced via tRPC queries.

### Email

Uses the framework's `EmailService`. No additional configuration beyond having email set up.

### Slack

Requires a Slack webhook URL configured per user or per org.

### Web Push (VAPID)

Browser push notifications using the Web Push protocol.

**Server setup** -- set environment variables:

```bash
VAPID_PUBLIC_KEY=BEl62iUYgU...
VAPID_PRIVATE_KEY=your-private-key
```

Generate VAPID keys with:

```bash
npx web-push generate-vapid-keys
```

**Client subscription** -- use the tRPC procedures to manage push subscriptions:

```typescript
// Get the VAPID public key
const { publicKey } = trpc.notification.getPushKey.useQuery();

// Subscribe the browser
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: publicKey,
});

// Register with the server
trpc.notification.subscribePush.useMutation().mutate({
  endpoint: subscription.endpoint,
  keys: {
    p256dh: subscription.toJSON().keys.p256dh,
    auth: subscription.toJSON().keys.auth,
  },
});
```

Unsubscribe with `notification.unsubscribePush`.

### SMS (Twilio)

Requires a Twilio account. Set environment variables:

```bash
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+15551234567
```

The user must have a phone number on their profile for SMS delivery.

### Webhook

Sends an HTTP POST to a user-configured URL. The webhook payload includes the event name and data returned by `toWebhook()`.

## Per-User Preferences

Notifications use an opt-out model -- all channels are enabled by default. Users can disable specific channels:

```typescript
// Disable email notifications
trpc.notification.updatePreference.useMutation().mutate({
  channel: 'email',
  enabled: false,
});

// Bulk update preferences
trpc.notification.bulkUpdatePreferences.useMutation().mutate({
  preferences: [
    { channel: 'email', enabled: false },
    { channel: 'sms', enabled: true },
    { channel: 'push', enabled: true },
  ],
});
```

## tRPC Procedures

| Procedure | Type | Description |
|-----------|------|-------------|
| `notification.getNotifications` | query | Paginated list of in-app notifications |
| `notification.getUnreadCount` | query | Number of unread notifications |
| `notification.markRead` | mutation | Mark a single notification as read |
| `notification.markAllRead` | mutation | Mark all notifications as read |
| `notification.getPushKey` | query | Get VAPID public key for push subscriptions |
| `notification.subscribePush` | mutation | Register a push subscription |
| `notification.unsubscribePush` | mutation | Remove a push subscription |
| `notification.updatePreference` | mutation | Update a single channel preference |
| `notification.bulkUpdatePreferences` | mutation | Update multiple channel preferences at once |
