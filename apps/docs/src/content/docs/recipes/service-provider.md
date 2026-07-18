---
title: "Recipe: Feature Module"
description: Creating a feature module with DI bindings, tRPC routers, event listeners, and page routes using @Module and registerModules.
---

Feature modules are the primary extension mechanism in CruzJS. They allow you to register DI bindings, tRPC routers, React Router routes, and event listeners using the `@Module` decorator and `registerModules()`.

:::caution[Removed APIs]
The `ServiceProvider` interface, `BaseServiceProvider`, `setUserProviders()`, and `setup.server.ts` registration have been removed. Use `@Module` classes with `registerModules([...])` instead.
:::

## Creating a Module

Use the `@Module` decorator to declare everything a feature contributes:

```typescript
// apps/web/src/features/analytics/analytics.module.ts
import { Module } from '@cruzjs/core/di';
import { AnalyticsService } from './analytics.service';
import { AnalyticsTracker } from './analytics-tracker.service';
import { analyticsRouter } from './analytics.router';
import { UserRegisteredEvent } from '@cruzjs/core/auth/events/user-registered.event';
import { trackRegistration } from './listeners/track-registration.listener';

@Module({
  providers: [
    AnalyticsService,
    AnalyticsTracker,
  ],
  trpcRouters: {
    analytics: analyticsRouter,
  },
  events: [
    {
      event: UserRegisteredEvent,
      listener: trackRegistration,
    },
  ],
})
export class AnalyticsModule {}
```

Register it in `registerModules()`:

```typescript
// src/app.server.ts
import 'reflect-metadata';
import { DrizzleService } from '@cruzjs/core/shared/database/drizzle.service';
import { registerModules } from '@cruzjs/core/framework/module-registry';
import { StartModule } from '@cruzjs/start/start.module';
import * as schema from './database/schema';
import { AnalyticsModule } from './features/analytics/analytics.module';

DrizzleService.setSchema(schema);
registerModules([StartModule, AnalyticsModule]);
```

### What @Module Does

The `@Module` decorator declares:

- **`providers`** -- Classes to register in the DI container (auto-bound as singletons)
- **`trpcRouters`** -- tRPC routers to merge into the application router
- **`events`** -- Event-listener pairs to register with the EventEmitterService
- **`pageRoutes`** -- React Router page routes contributed by this feature

## Module Lifecycle

The framework loads modules in a defined order:

1. **Core modules** load first (Auth, Org, Billing, Email, Jobs, Admin, Upload, AI)
2. **User modules** load next (your app's modules, in the order specified in `registerModules`)

Within each module, the lifecycle is:

1. **Module loading** -- `@Module` providers, routers, and events are collected
2. **Router registration** -- tRPC routers are merged
3. **Route registration** -- React Router routes are added
4. **Event registration** -- Event listeners are attached

## Advanced DI Bindings

For bindings that go beyond simple class registration, use provider objects in `@Module`:

```typescript
// apps/web/src/features/search/search.module.ts
import { Module } from '@cruzjs/core/di';
import { SearchService } from './search.service';
import { SEARCH_CLIENT } from './tokens';
import { ConfigService } from '@cruzjs/core';

@Module({
  providers: [
    SearchService,
    // Factory-based binding with runtime logic
    {
      provide: SEARCH_CLIENT,
      useFactory: (config: ConfigService) => {
        const apiKey = config.get<string>('SEARCH_API_KEY');
        if (!apiKey) return new LocalSearchClient();
        return new AlgoliaSearchClient(apiKey);
      },
      inject: [ConfigService],
    },
  ],
  trpcRouters: {
    search: searchRouter,
  },
})
export class SearchModule {}
```

## Adding Event Listeners

```typescript
@Module({
  providers: [NotificationService],
  events: [
    { event: MemberAddedEvent, listener: sendWelcomeNotification },
    { event: InvitationCreatedEvent, listener: sendInvitationNotification },
    { event: PaymentFailedEvent, listener: alertBillingAdmin },
  ],
})
export class NotificationModule {}
```

## Multiple Feature Modules

For larger applications, organize features into separate modules and pass them all to `registerModules()`:

```typescript
// src/app.server.ts
import 'reflect-metadata';
import { DrizzleService } from '@cruzjs/core/shared/database/drizzle.service';
import { registerModules } from '@cruzjs/core/framework/module-registry';
import { StartModule } from '@cruzjs/start/start.module';
import * as schema from './database/schema';
import { ProjectModule } from './features/projects/project.module';
import { ReportModule } from './features/reports/report.module';
import { NotificationModule } from './features/notifications/notification.module';
import { IntegrationModule } from './features/integrations/integration.module';

DrizzleService.setSchema(schema);
registerModules([
  StartModule,
  ProjectModule,
  ReportModule,
  NotificationModule,
  IntegrationModule,
]);
```

## Extending Core Behavior

Override or extend core services by rebinding tokens in your module:

```typescript
import { Module } from '@cruzjs/core/di';
import { SessionService } from '@cruzjs/core/auth/session.service';
import { CustomSessionService } from './custom-session.service';

@Module({
  providers: [
    // Replace the default session service with a custom one
    { provide: SessionService, useClass: CustomSessionService },
  ],
})
export class AuthExtensionModule {}
```

## Next Steps

- [CRUD Feature Recipe](/recipes/crud-feature) -- Build a complete feature
- [Adding a Package](/recipes/adding-package) -- Create new monorepo packages
- [Architecture](/architecture/request-lifecycle) -- Understand the module lifecycle
