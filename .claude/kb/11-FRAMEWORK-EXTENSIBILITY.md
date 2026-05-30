# Framework Extensibility

CruzJS follows a **Module** pattern, allowing you to extend the framework without modifying core code. Modules are registered via `createCruzApp({ modules: [...] })`.

## Architecture Overview

```
packages/
├── core/              # Framework core (DO NOT MODIFY)
├── pro/               # Pro features (billing, admin, audit logging)
└── start/             # UI components, theming, orgs, members, permissions, RBAC

apps/
└── web/               # Your application (EXTEND HERE)
    └── src/
        ├── features/  # Feature modules with providers
        ├── routes/    # Custom routes
        └── components/ # Custom components
```

## Modules

Modules are the primary way to extend CruzJS:

1. Create a `@Module` class with providers, trpcRouters, pageRoutes, and events
2. Register modules via `createCruzApp({ modules: [...] })`

### Creating a Module

```typescript
// apps/web/src/features/blog/blog.routes.ts
import type { CruzRouteHelpers } from '@cruzjs/core/routing';

export function blogRoutes(helpers: CruzRouteHelpers) {
  return [
    ...helpers.prefix('blog', [
      helpers.index('features/blog/routes/blog._index.tsx'),
      helpers.route(':id', 'features/blog/routes/blog.$id.tsx'),
      helpers.route('new', 'features/blog/routes/blog.new.tsx'),
    ]),
  ];
}
```

```typescript
// apps/web/src/features/blog/blog.module.ts
import { Module } from '@cruzjs/core';
import { BlogService } from './blog.service';
import { blogTrpc } from './blog.trpc';
import { PostCreatedEvent } from './events';
import { notifySubscribersListener } from './listeners';
import { blogRoutes } from './blog.routes';

@Module({
  providers: [BlogService],
  trpcRouters: {
    blog: blogTrpc,  // Available as trpc.blog.*
  },
  events: [
    { event: PostCreatedEvent, listener: notifySubscribersListener },
  ],
  pageRoutes: blogRoutes,
})
export class BlogModule {}
```

### Registering Modules

```typescript
// apps/web/src/server.cloudflare.ts
import { createCruzApp } from '@cruzjs/core/framework/create-cruz-app';
import { StartModule } from '@cruzjs/start/start.module';
import * as schema from './database/schema';
import { UserProfileModule } from './features/user-profile/user-profile.module';
import { BlogModule } from './features/blog/blog.module';

export default createCruzApp({
  schema,
  modules: [StartModule, UserProfileModule, BlogModule],
  pages: () => import('virtual:react-router/server-build'),
});
```

### Registering Module Page Routes

Pass modules to `createCruzRoutes` in `routes.ts` — pageRoutes declared in `@Module` are collected automatically:

```typescript
// apps/web/src/routes.ts
import { type RouteConfig, route, index, layout, prefix } from '@react-router/dev/routes';
import { createCruzRoutes } from '@cruzjs/core/routing';
import { registerCruzSaasRoutes } from '@cruzjs/saas/routing';
import { registerCruzStartRoutes } from '@cruzjs/start/routing';
import { BlogModule } from './features/blog/blog.module';

export default createCruzRoutes({
  route, index, layout, prefix,
  dir: import.meta.dirname,
  framework: {
    registrars: [registerCruzSaasRoutes, registerCruzStartRoutes],
  },
  modules: [BlogModule],
  routes: [index('routes/index.tsx')],
}) satisfies RouteConfig;
```

## Complete Feature Module Structure

```
features/blog/
├── index.ts                    # Barrel exports
├── blog.module.ts              # @Module with providers, trpcRouters, pageRoutes
├── blog.routes.ts              # React Router route config
├── blog.trpc.ts                # tRPC router
├── blog.service.ts             # Business logic (@Injectable)
├── blog.schema.ts              # Database schema
├── blog.validation.ts          # Zod schemas
├── blog.models.ts              # TypeScript types
├── routes/                     # Route page components
│   ├── blog._index.tsx
│   ├── blog.$id.tsx
│   └── blog.new.tsx
└── events/                     # Domain events
    ├── index.ts
    └── post-created.event.ts
```

## Extending Core Behavior

### Implementing Core Interfaces

```typescript
// Implement IUserHydrator to add data to session
import { Injectable, Inject, IUserHydrator, USER_HYDRATOR, DRIZZLE, type DrizzleDatabase } from '@cruzjs/core';

@Injectable()
export class UserProfileHydrator implements IUserHydrator {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  async hydrate(identityId: string, email: string) {
    const [profile] = await this.db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, identityId))
      .limit(1);

    return {
      profile: profile ?? null,
    };
  }
}

// Register in module
@Module({
  providers: [
    UserProfileService,
    UserProfileHydrator,
    { provide: USER_HYDRATOR, useClass: UserProfileHydrator },
  ],
  trpcRouters: {
    userProfile: userProfileTrpc,
  },
})
export class UserProfileModule {}
```

### Adding Custom Job Handlers

```typescript
import { Injectable, JOB_HANDLER } from '@cruzjs/core';

@Injectable()
export class BlogNotificationJobHandler implements JobHandler {
  readonly metadata: JobHandlerMetadata = {
    jobType: 'blog-notification',
    statuses: ['PENDING'],
  };

  async run(job: Job): Promise<JobResult> {
    // Process job
    return { success: true };
  }
}

// Register in module with multi-injection
@Module({
  providers: [
    BlogService,
    { provide: JOB_HANDLER, useClass: BlogNotificationJobHandler, multi: true },
  ],
})
export class BlogModule {}
```

### Listening to Core Events

Register listeners for core events via `@Module({ events: [...] })`:

```typescript
import { Module } from '@cruzjs/core';
import { IdentityCreatedEvent } from '@cruzjs/core';
import { OrganizationCreatedEvent } from '@cruzjs/start/orgs/events';
import { createProfileListener } from './listeners/create-profile.listener';
import { createOrgDefaultsListener } from './listeners/create-org-defaults.listener';

@Module({
  providers: [UserProfileService, ResourceService],
  events: [
    { event: IdentityCreatedEvent, listener: createProfileListener },
    { event: OrganizationCreatedEvent, listener: createOrgDefaultsListener },
  ],
})
export class MyFeatureModule {}
```

## Built-in Framework Modules

CruzJS ships with a rich set of built-in modules. Register them via `createCruzApp({ modules: [...] })`.

### From `@cruzjs/start`

```typescript
import { StartModule } from '@cruzjs/start/start.module';
```

`StartModule` is an aggregate module that includes:
- `OrgModule` -- Organizations, members, invitations
- `UserProfileModule` -- User profile management
- `ApiKeyModule` -- API key generation and validation
- `DashboardModule` -- Dashboard pages
- `NotificationModule` -- In-app, email, Slack, push, SMS, webhook notifications
- `RealTimeModule` -- Real-time event streaming
- `IntegrationModule` -- Third-party integrations
- `AiConnectionsModule` -- AI provider connections
- `SocialAuthModule` -- OAuth social login (GitHub, Google, Discord, etc.)

### From `@cruzjs/core`

```typescript
import { MaintenanceModule } from '@cruzjs/core/maintenance';
import { SchedulerModule } from '@cruzjs/core/scheduler';
import { FeatureFlagModule } from '@cruzjs/core/feature-flags';
import { WebhookModule } from '@cruzjs/core/webhooks';
import { BroadcastModule } from '@cruzjs/core/broadcasting';
import { RateLimitModule } from '@cruzjs/core/rate-limiting';
import { SessionModule } from '@cruzjs/core/sessions';
import { AuditModule } from '@cruzjs/core/audit';
import { TwoFactorModule } from '@cruzjs/core/two-factor';
import { MagicLinkModule } from '@cruzjs/core/magic-link';
import { SearchModule } from '@cruzjs/core/search';
import { MultiDatabaseModule } from '@cruzjs/core/multi-database';
import { SitemapModule } from '@cruzjs/core/sitemaps';
import { PaginationModule } from '@cruzjs/core/pagination';
import { SoftDeleteModule } from '@cruzjs/core/soft-delete';
import { VersioningModule } from '@cruzjs/core/versioning';
import { ApiModule } from '@cruzjs/core/api';
```

### From `@cruzjs/monitor`

```typescript
import { ErrorReportingModule } from '@cruzjs/monitor/error-reporting';
import { TracingModule } from '@cruzjs/monitor/tracing';
```

### From `@cruzjs/saas`

```typescript
import { AdminModule } from '@cruzjs/saas/admin/admin.module';
import { BillingModule } from '@cruzjs/saas/billing/billing.module';
import { RichTextModule } from '@cruzjs/saas/rich-text/rich-text.module';
```

### Complete Registration Example

```typescript
// apps/web/src/server.cloudflare.ts
import { createCruzApp } from '@cruzjs/core/framework/create-cruz-app';
import { CloudflareAdapter } from '@cruzjs/adapter-cloudflare';
import { StartModule } from '@cruzjs/start/start.module';
import { MaintenanceModule } from '@cruzjs/core/maintenance';
import { SchedulerModule } from '@cruzjs/core/scheduler';
import { FeatureFlagModule } from '@cruzjs/core/feature-flags';
import { WebhookModule } from '@cruzjs/core/webhooks';
import { BroadcastModule } from '@cruzjs/core/broadcasting';
import { RateLimitModule } from '@cruzjs/core/rate-limiting';
import { SessionModule } from '@cruzjs/core/sessions';
import { AuditModule } from '@cruzjs/core/audit';
import { TwoFactorModule } from '@cruzjs/core/two-factor';
import { MagicLinkModule } from '@cruzjs/core/magic-link';
import { SearchModule } from '@cruzjs/core/search';
import { MultiDatabaseModule } from '@cruzjs/core/multi-database';
import { SitemapModule } from '@cruzjs/core/sitemaps';
import { PaginationModule } from '@cruzjs/core/pagination';
import { SoftDeleteModule } from '@cruzjs/core/soft-delete';
import { VersioningModule } from '@cruzjs/core/versioning';
import { ApiModule } from '@cruzjs/core/api';
import { ErrorReportingModule } from '@cruzjs/monitor/error-reporting';
import { TracingModule } from '@cruzjs/monitor/tracing';
import { AdminModule } from '@cruzjs/saas/admin/admin.module';
import { BillingModule } from '@cruzjs/saas/billing/billing.module';
import { RichTextModule } from '@cruzjs/saas/rich-text/rich-text.module';
import * as schema from './database/schema';

export default createCruzApp({
  schema,
  adapter: new CloudflareAdapter(),
  modules: [
    StartModule,           // Org, UserProfile, ApiKeys, Dashboard, Notifications, RealTime, Integrations, AiConnections, SocialAuth
    MaintenanceModule,
    SchedulerModule,
    FeatureFlagModule,
    WebhookModule,
    BroadcastModule,
    RateLimitModule,
    SessionModule,
    AuditModule,
    TwoFactorModule,
    MagicLinkModule,
    SearchModule,
    MultiDatabaseModule,
    SitemapModule,
    PaginationModule,
    SoftDeleteModule,
    VersioningModule,
    ApiModule,
    ErrorReportingModule,
    TracingModule,
    AdminModule,
    BillingModule,
    RichTextModule,
  ],
  pages: () => import('virtual:react-router/server-build'),
});
```

You only need to register the modules you use. `StartModule` is the only one most apps require.

## Best Practices

### 1. Keep Modules Focused

```typescript
// GOOD: Single responsibility
@Module({ providers: [BlogService, PostService] })
export class BlogModule {}

@Module({ providers: [AnalyticsService] })
export class AnalyticsModule {}

// BAD: Multiple responsibilities
@Module({ providers: [BlogService, AnalyticsService, UserService, ...] })
export class EverythingModule {}
```

### 2. Use Dependency Injection

```typescript
// GOOD: Get from container
const blogService = container.resolve(BlogService);

// BAD: Direct instantiation
const blogService = new BlogService(db);
```

### 3. Listen to Events, Don't Modify Core

```typescript
// GOOD: React to events
events.on(UserRegisteredEvent, handleNewUser);

// BAD: Modify core service files
```

### 4. Declare Routes in *.routes.ts, Register via @Module

```typescript
// GOOD: Export from feature.routes.ts, reference in @Module
export function blogRoutes(helpers: CruzRouteHelpers) {
  return [...helpers.prefix('blog', [helpers.index('features/blog/routes/blog._index.tsx')])];
}

@Module({ pageRoutes: blogRoutes })
export class BlogModule {}

// Then in routes.ts:
export default createCruzRoutes({ modules: [BlogModule], ... });

// BAD: Manually wire routes in routes.ts with prefix()/route()
// BAD: Use registerRoutes() on the provider
```

### 5. Register Routers in Modules

```typescript
// GOOD: Module-level router registration
@Module({
  providers: [BlogService],
  trpcRouters: {
    blog: blogTrpc,
  },
})
export class BlogModule {}
```

## Module Lifecycle

```
1. createCruzApp({ schema, modules, adapter, pages })  # Configure and initialize:
   ├─ Create CruzContainer
   ├─ Load Core Modules (Auth, Email, Job, etc.)
   ├─ Load Start Modules (Org, Members, Permissions)
   ├─ Load Pro Modules (Billing, Admin)
   │
   ├─ For each registered module:
   │   └─ loadModule(ModuleClass)   # Load @Module class (providers, trpcRouters, pageRoutes, events)
   │
   └─ Boot phase (post-init)
```

## Package Boundary Rules

| Package | Purpose | Modify? |
|---------|---------|---------|
| `@cruzjs/core` | Framework foundation | Never |
| `@cruzjs/saas` | Commercial features | Never |
| `@cruzjs/start` | Shared components | Never |
| `apps/web/src/features/` | Your features | Always |
| `apps/web/src/routes/` | Your routes | Always |
| `apps/web/src/components/` | Your components | Always |
