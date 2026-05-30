---
title: Dependency Injection
description: How CruzJS uses Inversify for dependency injection, including containers, tokens, scopes, and common patterns.
---

CruzJS uses dependency injection (DI) to wire services together without hard-coding dependencies. The DI system is built on [Inversify](https://inversify.io/) with a declarative `@Module()` layer on top.

## Why Dependency Injection?

Without DI, services directly instantiate their dependencies:

```typescript
// Tightly coupled - hard to test, hard to swap implementations
class ProductService {
  private db = new DatabaseClient();
  private events = new EventEmitter();
}
```

With DI, dependencies are declared and injected by the container:

```typescript
// Loosely coupled - testable, swappable
@Injectable()
class ProductService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @Inject(EventEmitterService) private readonly events: EventEmitterService,
  ) {}
}
```

This gives you:

- **Testability**: Swap real services for mocks in tests.
- **Modularity**: Features register their own services without touching framework code.
- **Singleton management**: The container ensures one instance per service.
- **Decoupling**: Services depend on tokens, not concrete implementations.

## Core Concepts

### The `@Injectable()` Decorator

Every service class must be decorated with `@Injectable()` to be managed by the container:

```typescript
import { Injectable } from '@cruzjs/core/di';

@Injectable()
export class ProductService {
  // This class can now be injected and resolved
}
```

Without `@Injectable()`, the container cannot construct the class and will throw an error at resolution time.

### The `@Inject()` Decorator

Use `@Inject()` on constructor parameters to tell the container which dependency to provide:

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { DRIZZLE, type DrizzleDatabase } from '@cruzjs/core/shared/database/drizzle.service';

@Injectable()
export class ProductService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
  ) {}
}
```

The argument to `@Inject()` is a **token** -- either a class reference or a symbol that identifies the binding.

### Tokens

Tokens are the keys the container uses to look up bindings. CruzJS supports two kinds:

**Class tokens** -- the class itself serves as the token:

```typescript
@Injectable()
export class ProductService {}

// Resolve by class reference
const service = container.resolve(ProductService);
```

**Symbol tokens** -- for infrastructure services and interfaces:

```typescript
import { DRIZZLE } from '@cruzjs/core/shared/database/drizzle.service';

// DRIZZLE is a Symbol token bound to the database instance
@Inject(DRIZZLE) private readonly db: DrizzleDatabase
```

## Accessing the Container

The framework creates and configures the DI container during bootstrap. Access it with `getAppContainer()`:

```typescript
import { getAppContainer } from '@cruzjs/core';

const container = await getAppContainer();

// Resolve a service by class token
const service = container.resolve(ProductService);

// Resolve all implementations of a multi-injection token
const handlers = container.resolveAll(JOB_HANDLER);
```

These are the two methods you will use: `resolve()` for single bindings and `resolveAll()` for multi-injection tokens.

## Registering Services

### Simple Class Provider

The most common pattern. The class is bound as a singleton by default:

```typescript
@Module({
  providers: [ProductService, InventoryService],
})
export class ProductModule {}
```

### Class with Scope

Override the default singleton scope:

```typescript
@Module({
  providers: [
    { provide: RequestContext, scope: 'transient' },
  ],
})
export class MyModule {}
```

### Interface Binding (useClass)

Bind a token to a specific implementation:

```typescript
@Module({
  providers: [
    { provide: USER_HYDRATOR, useClass: UserProfileHydrator },
  ],
})
export class UserProfileModule {}
```

### Constant Value (useValue)

Bind a token to an already-constructed value:

```typescript
@Module({
  providers: [
    { provide: DRIZZLE, useValue: DrizzleService.getDb() },
  ],
})
export class SharedModule {}
```

### Factory (useFactory)

Dynamically create a value with access to other services:

```typescript
@Module({
  providers: [
    {
      provide: CacheService,
      useFactory: (config: ConfigService) =>
        new CacheService(config.getOrThrow('CACHE_PREFIX')),
      inject: [ConfigService],
    },
  ],
})
export class MyModule {}
```

### Alias (useExisting)

Point one token at another existing binding:

```typescript
@Module({
  providers: [
    { provide: 'DATABASE', useExisting: DRIZZLE },
  ],
})
export class MyModule {}
```

## Injection Scopes

| Scope | Behavior | Default? | Use Case |
|-------|----------|:--------:|----------|
| `singleton` | One instance for the entire app lifetime | Yes | Stateless services, database connections |
| `transient` | New instance every time it is resolved | No | Request-scoped contexts, stateful helpers |

```typescript
@Module({
  providers: [
    // Singleton (default) -- shared across all requests
    ProductService,

    // Explicit singleton
    { provide: ProductService, scope: 'singleton' },

    // Transient -- new instance per resolution
    { provide: RequestContext, scope: 'transient' },
  ],
})
export class MyModule {}
```

Most services should be singletons. Use transient scope only when the service holds per-request state.

## Multi-Injection

Multiple implementations can be registered under the same token using `multi: true`:

```typescript
@Module({
  providers: [
    { provide: JOB_HANDLER, useClass: SendEmailJobHandler, multi: true },
    { provide: JOB_HANDLER, useClass: EventListenerJobHandler, multi: true },
    { provide: JOB_HANDLER, useClass: CleanupJobHandler, multi: true },
  ],
})
export class JobModule {}
```

Resolve all implementations with `@MultiInject()` or `container.resolveAll()`:

```typescript
import { Injectable, MultiInject, Optional } from '@cruzjs/core/di';
import { JOB_HANDLER } from '@cruzjs/core/jobs';

@Injectable()
export class JobHandlerRegistry {
  constructor(
    @MultiInject(JOB_HANDLER) @Optional() private readonly handlers: JobHandler[] = [],
  ) {
    for (const handler of this.handlers) {
      this.register(handler);
    }
  }
}
```

The `@Optional()` decorator prevents an error if no implementations are registered.

## Optional Injection

Use `@Optional()` when a dependency might not be registered:

```typescript
import { Injectable, Inject, Optional } from '@cruzjs/core/di';

@Injectable()
export class NotificationService {
  constructor(
    @Inject(SlackService) @Optional() private readonly slack?: SlackService,
  ) {}

  async notify(message: string) {
    if (this.slack) {
      await this.slack.send(message);
    }
  }
}
```

## Common Tokens and Services

These are the tokens and services you will use most often:

| Token / Service | Type | Import | Purpose |
|-----------------|------|--------|---------|
| `DRIZZLE` | `DrizzleDatabase` | `@cruzjs/core/shared/database/drizzle.service` | Database instance |
| `EventEmitterService` | `EventEmitterService` | `@cruzjs/core/shared/events/event-emitter.service.server` | Dispatch domain events |
| `ConfigService` | `ConfigService` | `@cruzjs/core/shared/config/config.service` | Read environment variables |
| `StorageService` | `StorageService` | `@cruzjs/core` | File storage (R2/local) |
| `Logger` | `Logger` | `@cruzjs/core` | Structured logging |
| `JobService` | `JobService` | `@cruzjs/core` | Enqueue background jobs |
| `JOB_HANDLER` | `JobHandler` | `@cruzjs/core/jobs` | Multi-injection token for job handlers |
| `USER_HYDRATOR` | `IUserHydrator` | `@cruzjs/core` | Hydrate user session data |
| `OrgService` | `OrgService` | `@cruzjs/start` | Organization management |
| `MemberService` | `MemberService` | `@cruzjs/start` | Org member management |
| `BillingService` | `BillingService` | `@cruzjs/saas` | Subscription management |

## Resolving Services in Routers

tRPC routers are plain functions, not classes, so they cannot use constructor injection. Instead, resolve services from the container inside each procedure:

```typescript
import { getAppContainer } from '@cruzjs/core';
import { router, orgProcedure } from '@cruzjs/core/trpc/context';
import { ProductService } from './product.service';

export const productRouter = router({
  list: orgProcedure.query(async ({ ctx }) => {
    const container = await getAppContainer();
    const service = container.resolve(ProductService);
    return service.list(ctx.org.orgId);
  }),

  create: orgProcedure
    .input(createProductSchema)
    .mutation(async ({ ctx, input }) => {
      const container = await getAppContainer();
      const service = container.resolve(ProductService);
      return service.create(ctx.org.orgId, ctx.org.userId, input);
    }),
});
```

## Full Example: Injecting Multiple Dependencies

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { DRIZZLE, type DrizzleDatabase } from '@cruzjs/core/shared/database/drizzle.service';
import { EventEmitterService } from '@cruzjs/core/shared/events/event-emitter.service.server';
import { ConfigService } from '@cruzjs/core/shared/config/config.service';
import { eq, desc } from 'drizzle-orm';
import { products } from './product.schema';
import { ProductCreatedEvent } from './events';

@Injectable()
export class ProductService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @Inject(EventEmitterService) private readonly events: EventEmitterService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  async list(orgId: string): Promise<Product[]> {
    return this.db
      .select()
      .from(products)
      .where(eq(products.orgId, orgId))
      .orderBy(desc(products.createdAt));
  }

  async create(orgId: string, userId: string, input: CreateProductInput): Promise<Product> {
    const [product] = await this.db
      .insert(products)
      .values({
        orgId,
        createdById: userId,
        name: input.name,
        description: input.description,
      })
      .returning();

    await this.events.dispatch(
      new ProductCreatedEvent(product.id, orgId, userId, product.name),
    );

    return product;
  }
}
```

## Rules

1. **Always use `@Injectable()`** on service classes.
2. **Always use `@Inject()`** on constructor parameters.
3. **Never use `new`** to instantiate a service -- resolve it from the container.
4. **Default to singleton scope** unless the service holds per-request state.
5. **Use `@Module()` to register services** rather than manual container bindings. Use the `modules` array in `createCruzApp()` to register modules.
6. **Use `getAppContainer()`** in functional routers to resolve services. Use `@Inject()` property injection in OOP routers.
7. **Use symbol tokens** (like `DRIZZLE`) for infrastructure; use class tokens for application services.
