# Domain Events

Events decouple domains and enable side effects (emails, notifications, audit logs).

## Event Architecture

CruzJS uses an event emitter with two listener types:

1. **Synchronous listeners** - Execute immediately, same request
2. **Queued listeners** - Execute as background jobs

## Creating Events

### Event Class

```typescript
// features/my-feature/events/item-created.event.ts
import { AppEvent } from '@cruzjs/core';

export class ItemCreatedEvent extends AppEvent {
  constructor(
    public readonly itemId: string,
    public readonly orgId: string,
    public readonly createdById: string,
    public readonly name: string,
  ) {
    super();
  }
}
```

### Event Index

```typescript
// features/my-feature/events/index.ts
export * from './item-created.event';
export * from './item-updated.event';
export * from './item-deleted.event';
```

## Emitting Events

### In Service

```typescript
import { Injectable, Inject, EventEmitterService } from '@cruzjs/core';
import { ItemCreatedEvent } from './events';

@Injectable()
export class ItemService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @Inject(EventEmitterService) private readonly events: EventEmitterService,
  ) {}

  async create(orgId: string, userId: string, input: CreateInput): Promise<Item> {
    const [item] = await this.db
      .insert(items)
      .values({ orgId, createdById: userId, name: input.name })
      .returning();

    // Emit event after successful creation
    await this.events.dispatch(
      new ItemCreatedEvent(item.id, orgId, userId, item.name)
    );

    return item;
  }
}
```

## Listening to Events

### Synchronous Listeners

Execute immediately in the same request:

```typescript
// In provider
registerEventListeners(container: Container, events: EventEmitterService): void {
  const notificationService = container.get<NotificationService>(NotificationService);

  events.on(ItemCreatedEvent, async (event) => {
    await notificationService.notifyTeam(
      event.orgId,
      `New item created: ${event.name}`
    );
  });
}
```

### Queued Listeners

Execute as background jobs (for slow operations like emails):

```typescript
events.onQueue(ItemCreatedEvent, async (event) => {
  // This runs as a background job
  await emailService.sendItemCreatedEmail(event.createdById, event.name);
});
```

## Registering Listeners in @Module (preferred)

```typescript
// features/my-feature/my-feature.module.ts
import { Module } from '@cruzjs/core';
import { ItemCreatedEvent } from './events';
import { handleItemCreated } from './listeners/handle-item-created.listener';
import { sendItemNotifications } from './listeners/send-notifications.listener';

@Module({
  providers: [MyService],
  events: [
    { event: ItemCreatedEvent, listener: handleItemCreated },
    { event: ItemCreatedEvent, listener: sendItemNotifications },
  ],
})
export class MyFeatureModule {}
```

## Built-in Events

### Auth Events (from @cruzjs/core)

| Event | When Emitted |
|-------|--------------|
| `IdentityCreatedEvent` | New user identity created (register/OAuth) |
| `UserRegisteredEvent` | User completed registration |
| `UserLoggedInEvent` | User logged in successfully |
| `UserLoggedOutEvent` | User logged out |
| `EmailVerifiedEvent` | User verified email |
| `PasswordResetRequestedEvent` | Password reset requested |
| `PasswordResetCompletedEvent` | Password was reset |
| `SessionCreatedEvent` | New session created |
| `SessionDeletedEvent` | Session ended |

### Organization Events (from @cruzjs/start)

| Event | When Emitted |
|-------|--------------|
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

### Job Events (from @cruzjs/core)

| Event | When Emitted |
|-------|--------------|
| `JobCreatedEvent` | New job added to queue |
| `JobCompletedEvent` | Job completed successfully |
| `JobFailedEvent` | Job failed after retries |

## Listening to Core Events

Register listeners for core events via `@Module({ events: [...] })`:

```typescript
import { Module } from '@cruzjs/core';
import { IdentityCreatedEvent } from '@cruzjs/core';
import { OrganizationCreatedEvent } from '@cruzjs/start/orgs/events';
import { createUserProfile } from './listeners/create-profile.listener';
import { handleOrgCreated } from './listeners/handle-org-created.listener';

@Module({
  providers: [UserProfileService],
  events: [
    { event: IdentityCreatedEvent, listener: createUserProfile },
    { event: OrganizationCreatedEvent, listener: handleOrgCreated },
  ],
})
export class UserProfileModule {}
```

## Event Best Practices

1. **Keep events immutable** - Pass data in constructor, use readonly properties
2. **Include all needed data** - Don't require DB lookups in listeners
3. **Use queued listeners for slow ops** - Emails, external API calls
4. **Don't throw in listeners** - Catch errors, log them, don't break the flow
5. **Order independence** - Listeners should not depend on execution order
6. **Test events separately** - Unit test event emission and listener behavior

## Event Naming Convention

```typescript
// Pattern: <Resource><Action>Event
ItemCreatedEvent
ItemUpdatedEvent
ItemDeletedEvent
OrderPlacedEvent
PaymentReceivedEvent
MemberInvitedEvent
```
