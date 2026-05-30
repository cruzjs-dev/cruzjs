---
title: Modules
description: How to organize features into modules using the @Module() decorator, ContainerModule pattern, and barrel exports.
---

Modules are the unit of organization in CruzJS. Each feature is packaged as a module that declares its services, tRPC routers, page routes, and event listeners in one place.

## The `@Module()` Decorator

The `@Module()` decorator turns a class into a declarative container configuration:

```typescript
import { Module } from '@cruzjs/core/di';
import { ProductService } from './product.service';
import { productRouter } from './product.router';
import { ProductCreatedEvent } from './events';
import { notifyTeamListener } from './listeners';

@Module({
  providers: [ProductService],
  trpcRouters: {
    product: productRouter, // Available as trpc.product.*
  },
  events: [
    { event: ProductCreatedEvent, listener: notifyTeamListener },
  ],
})
export class ProductModule {}
```

The class body is intentionally empty. All configuration lives in the decorator metadata.

### Module Options

| Option | Type | Purpose |
|--------|------|---------|
| `providers` | `Provider[]` | Services, factories, and values to register in the DI container |
| `trpcRouters` | `Record<string, Router>` | tRPC routers to merge into the app router |
| `pageRoutes` | `(helpers) => RouteConfig[]` | React Router page routes for this feature |
| `events` | `EventBinding[]` | Event-to-listener mappings |

## Provider Types

The `providers` array accepts several forms:

```typescript
@Module({
  providers: [
    // 1. Simple class (singleton by default)
    ProductService,

    // 2. Class with explicit scope
    { provide: RequestContext, scope: 'transient' },

    // 3. Interface binding -- bind token to implementation
    { provide: USER_HYDRATOR, useClass: UserProfileHydrator },

    // 4. Constant value
    { provide: DRIZZLE, useValue: DrizzleService.getDb() },

    // 5. Factory with injected dependencies
    {
      provide: CacheService,
      useFactory: (config: ConfigService) =>
        new CacheService(config.getOrThrow('CACHE_PREFIX')),
      inject: [ConfigService],
    },

    // 6. Alias -- point one token at another
    { provide: 'DATABASE', useExisting: DRIZZLE },

    // 7. Multi-injection -- multiple impls for the same token
    { provide: JOB_HANDLER, useClass: SendEmailJobHandler, multi: true },
    { provide: JOB_HANDLER, useClass: CleanupJobHandler, multi: true },
  ],
})
export class MyModule {}
```

## Feature Module Structure

Every feature in `apps/web/src/features/` follows this file layout:

```
features/product/
├── index.ts                 # Barrel exports
├── product.module.ts        # @Module declaration
├── product.router.ts        # tRPC router
├── product.service.ts       # Business logic (@Injectable)
├── product.schema.ts        # Drizzle database schema
├── product.validation.ts    # Zod input schemas
├── product.models.ts        # TypeScript types
├── routes/                  # Feature-specific React Router routes
│   ├── index.tsx
│   └── $id.tsx
└── events/                  # Domain events (optional)
    ├── index.ts
    └── product-created.event.ts
```

### Module File

The module declares what the feature contributes to the application:

```typescript
// features/product/product.module.ts
import { Module } from '@cruzjs/core/di';
import { ProductService } from './product.service';
import { productRouter } from './product.router';
import { ProductCreatedEvent } from './events';
import { sendNotificationListener } from './listeners/send-notification.listener';

@Module({
  providers: [ProductService],
  trpcRouters: {
    product: productRouter,
  },
  events: [
    { event: ProductCreatedEvent, listener: sendNotificationListener },
  ],
})
export class ProductModule {}
```

### Barrel Exports (index.ts)

Every feature module has an `index.ts` that re-exports its public API:

```typescript
// features/product/index.ts
export { ProductModule } from './product.module';
export { ProductService } from './product.service';
export { productRouter } from './product.router';
export type { Product, NewProduct } from './product.schema';
```

This lets other modules import cleanly:

```typescript
import { ProductService } from '@cruzjs/web/features/product';
```

## Registering Modules

Modules are registered by passing them to `createCruzApp()`:

```typescript
// server.cloudflare.ts
import { createCruzApp } from '@cruzjs/core';
import { CloudflareAdapter } from '@cruzjs/adapter-cloudflare';
import * as schema from './database/schema';
import { UserProfileModule } from './features/user-profile';
import { ProductModule } from './features/product';
import { AnalyticsModule } from './features/analytics';

export default createCruzApp({
  schema,
  modules: [UserProfileModule, ProductModule, AnalyticsModule],
  adapter: new CloudflareAdapter(),
  pages: () => import('virtual:react-router/server-build'),
});
```

During bootstrap, the following happens for each module:

```
For each module in the modules array:
  1. container.loadModule(module)     # Bind providers, collect trpcRouters/events
  2. Collect trpcRouters              # tRPC routers are merged
  3. Collect pageRoutes               # React Router routes are added
  4. Register events                  # Event listeners are attached
```

### Load Order

Module order in the `modules` array matters when one module depends on another. Register foundational modules first:

```typescript
export default createCruzApp({
  schema,
  modules: [
    UserProfileModule,  // Other features may depend on user profiles
    ProductModule,       // Depends on user profiles for createdById
    AnalyticsModule,     // Depends on products for tracking
  ],
  // ...
});
```

Core and framework modules are loaded automatically before your app modules, so you do not need to register them.

## Core Modules

These modules ship with CruzJS and are loaded automatically:

| Module | Package | What It Provides |
|--------|---------|-----------------|
| `SharedModule` | `@cruzjs/core` | ConfigService, Logger, EventEmitterService, DRIZZLE, StorageService |
| `AuthModule` | `@cruzjs/core` | AuthService, SessionService, auth router |
| `EmailModule` | `@cruzjs/core` | EmailService, email templates |
| `JobModule` | `@cruzjs/core` | JobService, JobDispatcher, job handler registry |
| `UploadModule` | `@cruzjs/core` | Upload handling, storage integration |
| `OrgModule` | `@cruzjs/start` | OrgService, MemberService, InvitationService, org/member/invitation routers |
| `BillingModule` | `@cruzjs/saas` | BillingService, Stripe integration, billing router |
| `AdminModule` | `@cruzjs/saas` | Admin dashboard, admin router |
| `AuditModule` | `@cruzjs/saas` | AuditLogService, audit logging |

## Module Dependencies

Modules can depend on services from other modules. Since all modules are loaded into the same container, a service in one module can inject a service from another:

```typescript
// features/analytics/analytics.service.ts
import { Injectable, Inject } from '@cruzjs/core/di';
import { ProductService } from '@cruzjs/web/features/product';

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @Inject(ProductService) private readonly products: ProductService,
  ) {}

  async getProductStats(orgId: string) {
    const productList = await this.products.list(orgId);
    // ... compute analytics
  }
}
```

This works because `ProductModule` is loaded before `AnalyticsModule` (based on module order in `createCruzApp`), so `ProductService` is already bound in the container.

### Why There Is No `exports` Property

If you are coming from NestJS, you may notice that CruzJS modules have no `exports` array. This is intentional -- it is not a missing feature, it is a removed one.

#### The problem with NestJS `exports`

In NestJS, each module has its own scoped container. If `ProductModule` registers `ProductService`, that service is invisible to `AnalyticsModule` unless you do two things:

1. `export` the class from the TypeScript file (so you can import it)
2. Add it to the NestJS module's `exports` array (so the DI container exposes it)

In practice, almost every service ends up in `exports`. You write `ProductService` in `providers`, then immediately write it again in `exports`. When you forget -- and you will forget -- you get a cryptic runtime error: *"Nest can't resolve dependencies of AnalyticsService. Please make sure that ProductService is available in the current context."* The fix is always the same: go add it to `exports`.

This is busywork. You are maintaining two parallel visibility systems (TypeScript modules and NestJS module scoping) that almost always agree with each other.

#### How CruzJS handles it

CruzJS uses a **single flat container**. When a provider is registered in any module, it is available to every other module. There is no module-level scoping.

Visibility is controlled the way TypeScript already controls it -- through barrel exports:

```typescript
// features/product/index.ts

// Public API -- other modules can inject these
export { ProductService } from './product.service';
export { ProductModule } from './product.module';

// InventoryCalculator is NOT exported.
// Other modules cannot import the class, so they cannot use it
// as an injection token. It stays private to this feature.
```

If you do not export a class from your `index.ts`, no other module can reference it as a token. You get the same encapsulation that NestJS `exports` provides, using a mechanism you already understand and maintain.

#### Why this works for CruzJS

- **One process, one container.** CruzJS apps deploy as a single Cloudflare Worker (or container via adapters). There is no microservice boundary where module scoping would provide real isolation. A flat container matches the runtime reality.
- **No `forwardRef()` headaches.** NestJS's module scoping frequently causes circular dependency issues that require `forwardRef()` or a `SharedModule` to resolve. A flat container avoids this class of bugs entirely.
- **Fewer runtime surprises.** If TypeScript compiles, the dependency exists. You do not discover missing `exports` entries at startup.

## Event Bindings in Modules

The `events` array in `@Module()` connects domain events to listener functions:

```typescript
@Module({
  providers: [OrderService],
  events: [
    // Multiple listeners for the same event
    { event: OrderCreatedEvent, listener: sendConfirmationEmail },
    { event: OrderCreatedEvent, listener: updateInventory },
    { event: OrderCreatedEvent, listener: notifyWarehouse },

    // Different events
    { event: OrderCancelledEvent, listener: processRefund },
  ],
})
export class OrderModule {}
```

Listeners are plain async functions:

```typescript
// listeners/send-confirmation-email.listener.ts
import { getAppContainer } from '@cruzjs/core';
import { EmailService } from '@cruzjs/core/email';
import { OrderCreatedEvent } from '../events';

export async function sendConfirmationEmail(event: OrderCreatedEvent): Promise<void> {
  const container = await getAppContainer();
  const emailService = container.resolve(EmailService);

  await emailService.sendEmail(
    event.customerEmail,
    'Order Confirmed',
    `<h1>Order #${event.orderId} confirmed</h1>`,
  );
}
```

## Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Module class | `PascalCase` + `Module` | `ProductModule` |
| Module file | `kebab-case` + `.module.ts` | `product.module.ts` |
| Feature directory | `kebab-case` | `features/product/` |

## Best Practices

**Keep modules focused.** One module per domain concept:

```typescript
// Good: focused modules
@Module({ providers: [ProductService] })
export class ProductModule {}

@Module({ providers: [AnalyticsService] })
export class AnalyticsModule {}

// Bad: everything in one module
@Module({ providers: [ProductService, AnalyticsService, UserService] })
export class AppModule {}
```

**Use the `@Module()` decorator for everything.** Prefer declarative registration over imperative methods:

```typescript
// Preferred: declarative
@Module({
  providers: [ProductService],
  trpcRouters: { product: productRouter },
  events: [{ event: ProductCreatedEvent, listener: onProductCreated }],
})
export class ProductModule {}
```

**Always export through index.ts.** Other modules should import from the barrel, not from internal files:

```typescript
// Good
import { ProductService } from '@cruzjs/web/features/product';

// Bad
import { ProductService } from '@cruzjs/web/features/product/product.service';
```
