---
title: Domain Events
description: Decouple your features with CruzJS's event system — emit events from services, register listeners in providers, and react to built-in auth and org lifecycle events.
---

CruzJS includes a domain event system that lets you decouple features and trigger side effects without creating hard dependencies between modules. Events flow through an `EventEmitterService` that supports both synchronous and queued (background job) listeners.

## How Events Work

```
Service emits event
       │
       ▼
EventEmitterService.dispatch()
       │
       ├─► Synchronous listeners (same request)
       │
       └─► Queued listeners (background job)
```

Synchronous listeners execute immediately within the current request. Queued listeners are dispatched as background jobs and processed asynchronously, making them ideal for slow operations like sending emails or calling external APIs.

## Creating Event Classes

Events are simple classes that extend `AppEvent`. Use readonly properties to keep events immutable.

```typescript
// features/invoices/events/invoice-created.event.ts
import { AppEvent } from '@cruzjs/core/shared/events/event';

export class InvoiceCreatedEvent extends AppEvent {
  constructor(
    public readonly invoiceId: string,
    public readonly orgId: string,
    public readonly createdById: string,
    public readonly amount: number,
    public readonly currency: string,
  ) {
    super();
  }
}
```

Follow the naming convention `<Resource><Action>Event`:

```typescript
InvoiceCreatedEvent
InvoicePaidEvent
InvoiceCancelledEvent
OrderPlacedEvent
MemberInvitedEvent
```

Create a barrel export for your feature's events:

```typescript
// features/invoices/events/index.ts
export * from './invoice-created.event';
export * from './invoice-paid.event';
export * from './invoice-cancelled.event';
```

## Emitting Events from Services

Inject `EventEmitterService` and call `dispatch()` after your business logic succeeds:

```typescript
// features/invoices/invoice.service.ts
import { Injectable, Inject } from '@cruzjs/core/di';
import { DRIZZLE, type DrizzleDatabase } from '@cruzjs/core/shared/database/drizzle.service';
import { EventEmitterService } from '@cruzjs/core/shared/events/event-emitter.service.server';
import { InvoiceCreatedEvent } from './events';
import { invoices } from '../../database/schema';

@Injectable()
export class InvoiceService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @Inject(EventEmitterService) private readonly events: EventEmitterService,
  ) {}

  async createInvoice(orgId: string, userId: string, input: CreateInvoiceInput) {
    const [invoice] = await this.db
      .insert(invoices)
      .values({
        orgId,
        createdById: userId,
        amount: input.amount,
        currency: input.currency,
      })
      .returning();

    // Emit event after successful database write
    await this.events.dispatch(
      new InvoiceCreatedEvent(invoice.id, orgId, userId, input.amount, input.currency)
    );

    return invoice;
  }
}
```

Always emit events _after_ the primary operation succeeds. If the database insert fails, no event is emitted, which prevents listeners from reacting to data that does not exist.

## Registering Listeners

### In a Module (Preferred)

Register event listeners directly in your `@Module` using the `events` option. Listeners are plain async functions:

```typescript
// features/invoices/listeners/notify-accounting.listener.ts
import { getAppContainer } from '@cruzjs/core';
import { InvoiceCreatedEvent } from '../events';
import { AccountingService } from '../accounting.service';

export async function notifyAccountingListener(event: InvoiceCreatedEvent): Promise<void> {
  const container = await getAppContainer();
  const accountingService = container.resolve(AccountingService);
  await accountingService.recordNewInvoice(event.invoiceId, event.amount, event.currency);
}
```

```typescript
// features/invoices/invoice.module.ts
import { Module } from '@cruzjs/core/di';
import { InvoiceService } from './invoice.service';
import { invoiceRouter } from './invoice.router';
import { InvoiceCreatedEvent } from './events';
import { notifyAccountingListener } from './listeners/notify-accounting.listener';
import { sendInvoiceEmailListener } from './listeners/send-invoice-email.listener';

@Module({
  providers: [InvoiceService],
  trpcRouters: {
    invoice: invoiceRouter,
  },
  events: [
    { event: InvoiceCreatedEvent, listener: notifyAccountingListener },
    { event: InvoiceCreatedEvent, listener: sendInvoiceEmailListener },
  ],
})
export class InvoiceModule {}
```

Multiple listeners can be registered for the same event. They execute independently.

### Queued Listeners

For background job listeners that use `events.onQueue()`, register them in your `@Module` events array. The event system handles dispatching queued listeners as background jobs automatically.

## Synchronous vs. Queued Listeners

| Aspect | `events.on()` / Module `events` | `events.onQueue()` |
|--------|----------------------------------|---------------------|
| Execution | Same request, immediate | Background job |
| Latency impact | Adds to response time | None |
| Failure handling | Error propagates to caller | Retried automatically |
| Use cases | Audit logs, cache invalidation | Emails, webhooks, Slack |

Use synchronous listeners for fast, critical operations that must complete before the response is sent. Use queued listeners for anything slow or non-critical.

## Listening to Built-in Events

CruzJS emits events for authentication, organization, and job lifecycle actions. You can listen to these in your own modules to react to framework-level changes.

### Auth Events (from `@cruzjs/core`)

| Event | When Emitted |
|-------|-------------|
| `IdentityCreatedEvent` | New user identity created (register or OAuth) |
| `UserRegisteredEvent` | User completed registration |
| `UserLoggedInEvent` | User logged in successfully |
| `UserLoggedOutEvent` | User logged out |
| `EmailVerifiedEvent` | User verified their email |
| `PasswordResetRequestedEvent` | Password reset requested |
| `PasswordResetCompletedEvent` | Password was reset |
| `SessionCreatedEvent` | New session created |
| `SessionDeletedEvent` | Session ended |

### Organization Events (from `@cruzjs/saas`)

| Event | When Emitted |
|-------|-------------|
| `OrganizationCreatedEvent` | New organization created |
| `OrganizationUpdatedEvent` | Organization details updated |
| `OrganizationDeletedEvent` | Organization soft-deleted |
| `MemberAddedEvent` | Member added to org |
| `MemberRemovedEvent` | Member removed from org |
| `MemberRoleChangedEvent` | Member role changed |
| `InvitationCreatedEvent` | Invitation sent |
| `InvitationAcceptedEvent` | Invitation accepted |
| `InvitationDeclinedEvent` | Invitation declined |
| `InvitationCancelledEvent` | Invitation cancelled |

### Job Events (from `@cruzjs/core`)

| Event | When Emitted |
|-------|-------------|
| `JobCreatedEvent` | New job added to queue |
| `JobCompletedEvent` | Job completed successfully |
| `JobFailedEvent` | Job failed after all retries |

### Example: Reacting to Core Events

```typescript
import { Module } from '@cruzjs/core/di';
import { IdentityCreatedEvent } from '@cruzjs/core';
import { OrganizationCreatedEvent } from '@cruzjs/saas';

async function createUserProfile(event: IdentityCreatedEvent): Promise<void> {
  const container = await getAppContainer();
  const profileService = container.resolve(UserProfileService);
  await profileService.createProfile({
    id: event.identityId,
    email: event.email,
    fullName: event.initialName,
    avatarUrl: `https://avatar.vercel.sh/${event.email}`,
  });
}

async function setupOrgDefaults(event: OrganizationCreatedEvent): Promise<void> {
  const container = await getAppContainer();
  const setupService = container.resolve(OrgSetupService);
  await setupService.createDefaultResources(event.orgId);
}

@Module({
  providers: [UserProfileService, OrgSetupService],
  events: [
    { event: IdentityCreatedEvent, listener: createUserProfile },
    { event: OrganizationCreatedEvent, listener: setupOrgDefaults },
  ],
})
export class OnboardingModule {}
```

## Best Practices

1. **Keep events immutable.** Pass all data in the constructor and use `readonly` properties. Never mutate an event after creation.

2. **Include all data listeners need.** Listeners should not need to query the database to get basic information about what happened. Put IDs, names, and relevant values directly on the event.

3. **Use queued listeners for slow operations.** Anything involving network calls (emails, webhooks, third-party APIs) should use `events.onQueue()` so it does not block the HTTP response.

4. **Do not throw in listeners.** Catch and log errors inside listeners. A failing listener should not break the primary operation or other listeners.

5. **Keep listeners order-independent.** Multiple listeners on the same event execute independently. Never assume one listener runs before another.

6. **One event per significant state change.** Emit events for meaningful domain actions, not for every database write. `InvoiceCreatedEvent` is good; `InvoiceFieldUpdatedEvent` is too granular.

7. **Test events separately.** Unit test that your service emits the correct event, and separately test that your listener performs the correct action when it receives an event.
