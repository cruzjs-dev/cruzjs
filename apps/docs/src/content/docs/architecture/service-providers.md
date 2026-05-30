---
title: Module Registration
description: How to register feature modules with createCruzApp, configure providers, tRPC routers, page routes, and event listeners using the @Module pattern.
---

## Registering Modules with createCruzApp

Feature modules are registered by passing them to `createCruzApp()` in your server entry file (`server.cloudflare.ts` for Cloudflare deployments):

```typescript
// server.cloudflare.ts
import { createCruzApp } from '@cruzjs/core';
import { CloudflareAdapter } from '@cruzjs/adapter-cloudflare';
import * as schema from './database/schema';
import { ProductModule } from './features/product/product.module';
import { AnalyticsModule } from './features/analytics/analytics.module';
import { NotificationModule } from './features/notifications/notification.module';

export default createCruzApp({
  schema,
  modules: [ProductModule, AnalyticsModule, NotificationModule],
  adapter: new CloudflareAdapter(),
  pages: () => import('virtual:react-router/server-build'),
});
```

Each module is a `@Module()` class that declares everything the feature contributes -- services, tRPC routers, page routes, and event listeners:

```typescript
import { Module } from '@cruzjs/core/di';

@Module({
  providers: [ProductService, InventoryService],
  trpcRouters: {
    product: productRouter,
    inventory: inventoryRouter,
  },
  events: [
    { event: ProductCreatedEvent, listener: updateSearchIndex },
    { event: ProductCreatedEvent, listener: notifyTeam },
  ],
})
export class ProductModule {}
```

No separate `.provider.ts` file is needed. The module is the only file required.

### Module Options

| Option | Type | Purpose |
|--------|------|---------|
| `providers` | `Provider[]` | Services, factories, and values to register in the DI container |
| `trpcRouters` | `Record<string, Router>` | tRPC routers to merge into the app router |
| `pageRoutes` | `(helpers) => RouteConfig[]` | React Router page routes |
| `events` | `EventBinding[]` | Event-to-listener mappings |

### Module Ordering

Module order in the `modules` array determines load order. Register modules that other modules depend on first:

```typescript
export default createCruzApp({
  schema,
  modules: [
    // UserProfileModule must come first -- other features inject UserProfileService
    UserProfileModule,
    // ProductModule depends on UserProfileService for creator info
    ProductModule,
    // AnalyticsModule depends on ProductService
    AnalyticsModule,
  ],
  adapter: new CloudflareAdapter(),
  pages: () => import('virtual:react-router/server-build'),
});
```

Core modules (`SharedModule`, `AuthModule`, `JobModule`, etc.) and framework modules (`OrgModule`, `BillingModule`, etc.) are loaded automatically before your app modules.

## The `@Module()` Class

The `@Module()` decorator is the recommended way to declare providers, tRPC routers, page routes, and events:

```typescript
import { Module } from '@cruzjs/core/di';

@Module({
  providers: [ProductService, InventoryService],
  trpcRouters: {
    product: productRouter,
    inventory: inventoryRouter,
  },
  pageRoutes: (helpers) => [
    ...helpers.prefix('products', [
      helpers.index('features/product/routes/index.tsx'),
      helpers.route(':id', 'features/product/routes/$id.tsx'),
    ]),
  ],
  events: [
    { event: ProductCreatedEvent, listener: updateSearchIndex },
    { event: ProductCreatedEvent, listener: notifyTeam },
  ],
})
export class ProductModule {}
```

For many features, this is all you need -- a single module file with no separate provider.

### Page Routes in Modules

The `pageRoutes` factory receives route helpers (`prefix`, `index`, `route`, `layout`) and returns route configuration. Route files should live inside the feature directory:

```
src/features/product/
├── product.service.ts
├── product.router.ts
├── product.module.ts
├── routes/
│   ├── index.tsx            # /products (list page)
│   └── $id.tsx              # /products/:id (detail page)
└── index.ts
```

Routes declared in `pageRoutes` are automatically merged into the application's route tree when the module is passed to `createCruzApp()` or `createCruzRoutes()`.

In most cases, you will register routes directly in `src/routes.ts` instead of using `pageRoutes`:

```ts
// src/routes.ts
...prefix('products', [
  index('features/product/routes/index.tsx'),
  route(':id', 'features/product/routes/$id.tsx'),
]),
```

The `pageRoutes` option is primarily useful for framework packages that need to contribute routes programmatically.

## Extending Core Behavior

### Implementing Core Interfaces

Some core tokens expect your application to provide an implementation. The most common is `USER_HYDRATOR`:

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { IUserHydrator, USER_HYDRATOR } from '@cruzjs/core';
import { DRIZZLE, type DrizzleDatabase } from '@cruzjs/core/shared/database/drizzle.service';
import { userProfiles } from './user-profile.schema';

@Injectable()
export class UserProfileHydrator implements IUserHydrator {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  async hydrate(identityId: string, email: string) {
    const [profile] = await this.db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, identityId))
      .limit(1);

    return { profile: profile ?? null };
  }
}

@Module({
  providers: [
    UserProfileService,
    UserProfileHydrator,
    { provide: USER_HYDRATOR, useClass: UserProfileHydrator },
  ],
  trpcRouters: { userProfile: userProfileRouter },
})
export class UserProfileModule {}
```

### Adding Custom Job Handlers

Register job handlers using multi-injection so the job runner discovers them automatically:

```typescript
import { Injectable } from '@cruzjs/core/di';
import { JOB_HANDLER, type JobHandler, type Job, type JobResult } from '@cruzjs/core/jobs';

@Injectable()
export class GenerateReportJobHandler implements JobHandler {
  readonly metadata = {
    jobType: 'generate-report',
    statuses: ['PENDING'],
  };

  async run(job: Job): Promise<JobResult> {
    const { orgId, reportType } = job.payload;
    // ... generate the report
    return { success: true };
  }
}

@Module({
  providers: [
    ReportService,
    { provide: JOB_HANDLER, useClass: GenerateReportJobHandler, multi: true },
  ],
})
export class ReportModule {}
```

### Listening to Core Events

React to framework events without modifying core code:

```typescript
import { IdentityCreatedEvent } from '@cruzjs/core';
import { OrganizationCreatedEvent, MemberAddedEvent } from '@cruzjs/saas';

@Module({
  providers: [OnboardingService],
  events: [
    // Create a profile when a user registers
    { event: IdentityCreatedEvent, listener: createUserProfile },

    // Set up defaults when an org is created
    { event: OrganizationCreatedEvent, listener: createDefaultResources },

    // Send welcome message when a member joins
    { event: MemberAddedEvent, listener: sendWelcomeMessage },
  ],
})
export class OnboardingModule {}
```

## Complete Example

Here is a full feature built with a module, with routes co-located inside the feature directory:

```
src/features/invoice/
├── invoice.service.ts
├── invoice.router.ts
├── invoice.module.ts
├── events/
│   └── invoice-created.event.ts
├── jobs/
│   └── generate-pdf.job-handler.ts
├── listeners/
│   └── send-invoice-email.listener.ts
├── routes/
│   ├── index.tsx              # /invoices (list page)
│   └── $id.tsx                # /invoices/:id (detail page)
└── index.ts
```

```typescript
// features/invoice/invoice.module.ts
import { Module } from '@cruzjs/core/di';
import { JOB_HANDLER } from '@cruzjs/core/jobs';
import { InvoiceService } from './invoice.service';
import { invoiceRouter } from './invoice.router';
import { InvoiceCreatedEvent } from './events';
import { sendInvoiceEmailListener } from './listeners/send-invoice-email.listener';
import { GeneratePdfJobHandler } from './jobs/generate-pdf.job-handler';

@Module({
  providers: [
    InvoiceService,
    { provide: JOB_HANDLER, useClass: GeneratePdfJobHandler, multi: true },
  ],
  trpcRouters: {
    invoice: invoiceRouter,
  },
  events: [
    { event: InvoiceCreatedEvent, listener: sendInvoiceEmailListener },
  ],
})
export class InvoiceModule {}
```

Routes are registered in `src/routes.ts`, pointing to the feature's route files:

```ts
// src/routes.ts
...prefix('invoices', [
  index('features/invoice/routes/index.tsx'),
  route(':id', 'features/invoice/routes/$id.tsx'),
]),
```

```typescript
// features/invoice/index.ts
export { InvoiceModule } from './invoice.module';
export { InvoiceService } from './invoice.service';
```

## Legacy: Service Provider Pattern (Removed)

:::caution[Removed]
The `ServiceProvider` pattern, `BaseServiceProvider`, `setUserProviders()`, and `setup.server.ts` registration have been removed. Use `@Module` classes with `createCruzApp({ modules: [...] })` instead. If you are migrating from an older version, extract your module class from the provider and add it directly to the `modules` array in `createCruzApp()`.
:::

### Migration Example

**Before (removed):**
```typescript
// setup.server.ts — THIS FILE NO LONGER EXISTS
import { setUserProviders } from '@cruzjs/core/framework/application.server';
import { ProductProvider } from './features/product';

setUserProviders(() => [ProductProvider]);
```

**After:**
```typescript
// server.cloudflare.ts
import { createCruzApp } from '@cruzjs/core';
import { CloudflareAdapter } from '@cruzjs/adapter-cloudflare';
import * as schema from './database/schema';
import { ProductModule } from './features/product/product.module';

export default createCruzApp({
  schema,
  modules: [ProductModule],
  adapter: new CloudflareAdapter(),
  pages: () => import('virtual:react-router/server-build'),
});
```

No separate `.provider.ts` file is needed. The `@Module` class is the only file required.

## Package Boundary Rules

| Package | Purpose | Should You Modify? |
|---------|---------|:------------------:|
| `@cruzjs/core` | Framework foundation | Never |
| `@cruzjs/saas` | Billing, admin, audit logging | Never |
| `@cruzjs/start` | UI components, theming | Never |
| `src/features/` | Your feature modules (including routes) | Always |
| `src/routes/` | Root-level pages and API routes | Always |
| `src/components/` | Your shared UI components | Always |

Extend the framework through modules and event listeners. Do not modify core or pro package source files.
