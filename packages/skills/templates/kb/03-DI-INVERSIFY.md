# Dependency Injection (CruzJS DI)

CruzJS uses a custom DI system built on Inversify with declarative `@Module()` decorators.

## Core Pattern

### 1. Create Injectable Service

```typescript
// features/my-feature/my-feature.service.ts
import { Injectable, Inject, DRIZZLE, type DrizzleDatabase, EventEmitterService } from '@cruzjs/core';

@Injectable()
export class MyFeatureService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @Inject(EventEmitterService) private readonly events: EventEmitterService,
  ) {}

  async list(orgId: string): Promise<MyItem[]> {
    return this.db
      .select()
      .from(myItems)
      .where(eq(myItems.orgId, orgId));
  }
}
```

### 2. Create Module

```typescript
// features/my-feature/my-feature.module.ts
import { Module } from '@cruzjs/core';
import { MyFeatureService } from './my-feature.service';
import { myFeatureTrpc } from './my-feature.trpc';

@Module({
  providers: [MyFeatureService],
  trpcRouters: {
    myFeature: myFeatureTrpc,
  },
})
export class MyFeatureModule {}
```

### 3. Register Module in createCruzApp

```typescript
// apps/web/src/server.cloudflare.ts
import { createCruzApp } from '@cruzjs/core/framework/create-cruz-app';
import { StartModule } from '@cruzjs/start/start.module';
import * as schema from './database/schema';
import { MyFeatureModule } from './features/my-feature/my-feature.module';

export default createCruzApp({
  schema,
  modules: [StartModule, MyFeatureModule],
  pages: () => import('virtual:react-router/server-build'),
});
```

## @Module Decorator

The `@Module()` decorator defines a module with providers and trpcRouters:

```typescript
import { Module } from '@cruzjs/core';

@Module({
  providers: [
    // Simple class providers (singleton by default)
    MyService,
    AnotherService,

    // Class with scope option
    { provide: RequestContext, scope: 'transient' },

    // UseClass - bind interface to implementation
    { provide: UserHydrator, useClass: CustomUserHydrator },

    // UseValue - constant values
    { provide: DRIZZLE, useValue: DrizzleService.getDb() },

    // UseFactory - dynamic creation with dependencies
    {
      provide: CacheService,
      useFactory: (kv: KVService) => new CacheService(kv),
      inject: [KVService],
    },

    // UseExisting - alias one token to another
    { provide: 'DATABASE', useExisting: DRIZZLE },

    // Multi-injection - multiple implementations for same token
    { provide: JOB_HANDLER, useClass: SendEmailJobHandler, multi: true },
    { provide: JOB_HANDLER, useClass: EventJobHandler, multi: true },
  ],
  trpcRouters: {
    myFeature: myFeatureTrpc,  // Available as trpc.myFeature.*
  },
  events: [
    // Event listeners - multiple listeners per event supported
    { event: UserRegisteredEvent, listener: sendWelcomeEmail },
    { event: UserRegisteredEvent, listener: createUserProfile },
    { event: OrderCreatedEvent, listener: notifyWarehouse },
  ],
})
export class MyFeatureModule {}
```

## Injection Patterns

### Inject Database

```typescript
import { Injectable, Inject, DRIZZLE, type DrizzleDatabase } from '@cruzjs/core';

@Injectable()
export class MyService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}
}
```

### Inject Another Service

```typescript
import { Injectable, Inject } from '@cruzjs/core';
import { OrgService } from '@cruzjs/start/orgs';

@Injectable()
export class MyService {
  constructor(@Inject(OrgService) private readonly orgService: OrgService) {}
}
```

### Inject Config

```typescript
import { Injectable, Inject, ConfigService } from '@cruzjs/core';

@Injectable()
export class MyService {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  doSomething() {
    const appUrl = this.config.getOrThrow<string>('APP_URL');
    const port = this.config.get<number>('PORT', 3000);
  }
}
```

### Inject KV Cache

```typescript
import { Injectable, Inject, KVCacheServiceFactory, KVCacheService } from '@cruzjs/core';

@Injectable()
export class MyService {
  private cache: KVCacheService;

  constructor(@Inject(KVCacheServiceFactory) cacheFactory: KVCacheServiceFactory) {
    this.cache = cacheFactory.create('my-feature');
  }

  async getCached(key: string) {
    return this.cache.get(key);
  }

  async setCached(key: string, value: unknown, ttlSeconds: number) {
    await this.cache.set(key, value, ttlSeconds);
  }
}
```

### Inject Event Emitter

```typescript
import { Injectable, Inject, EventEmitterService } from '@cruzjs/core';

@Injectable()
export class MyService {
  constructor(@Inject(EventEmitterService) private readonly events: EventEmitterService) {}

  async create(input: CreateInput): Promise<Item> {
    const item = await this.db.insert(items).values(input).returning();
    await this.events.dispatch(new ItemCreatedEvent(item.id));
    return item;
  }
}
```

### Optional Injection

```typescript
import { Injectable, Inject, Optional } from '@cruzjs/core';

@Injectable()
export class MyService {
  constructor(
    @Inject(SomeService) @Optional() private readonly optionalService?: SomeService
  ) {}
}
```

### Multi-Injection

```typescript
import { Injectable, MultiInject, Optional, JOB_HANDLER } from '@cruzjs/core';

@Injectable()
export class JobHandlerRegistry {
  constructor(
    @MultiInject(JOB_HANDLER) @Optional() handlers: JobHandler[] = []
  ) {
    for (const handler of handlers) {
      this.register(handler);
    }
  }
}
```

## Getting Services in Routers

```typescript
import { getAppContainer } from '@cruzjs/core';
import { MyFeatureService } from './my-feature.service';

export const myFeatureTrpc = router({
  list: orgProcedure.query(async ({ ctx }) => {
    const container = await getAppContainer();
    const service = container.resolve(MyFeatureService);
    return service.list(ctx.org.orgId);
  }),
});
```

## Common Symbols & Services

| Symbol/Service | Type | Package | Purpose |
|----------------|------|---------|---------|
| `DRIZZLE` | `DrizzleDatabase` | `@cruzjs/core` | Database instance (D1/SQLite) |
| `ConfigService` | `ConfigService` | `@cruzjs/core` | Configuration access |
| `CloudflareContext` | `CloudflareContext` | `@cruzjs/core` | D1/KV/R2/AI bindings |
| `KVCacheServiceFactory` | `KVCacheServiceFactory` | `@cruzjs/core` | KV cache namespacing |
| `EventEmitterService` | `EventEmitterService` | `@cruzjs/core` | Event dispatch |
| `Logger` | `Logger` | `@cruzjs/core` | Structured logging |
| `StorageService` | `StorageService` | `@cruzjs/core` | File storage (R2) |
| `JOB_HANDLER` | `JobHandler` | `@cruzjs/core` | Job handler symbol |
| `USER_HYDRATOR` | `IUserHydrator` | `@cruzjs/core` | User data hydration |
| `OrgService` | `OrgService` | `@cruzjs/start` | Organization management |
| `MemberService` | `MemberService` | `@cruzjs/start` | Member management |
| `BillingService` | `BillingService` | `@cruzjs/saas` | Subscription management |

## Scope Types

```typescript
@Module({
  providers: [
    // Singleton - one instance for entire app (default)
    MyService,

    // Explicit singleton
    { provide: MyService, scope: 'singleton' },

    // Transient - new instance every resolution
    { provide: RequestContext, scope: 'transient' },

    // Constant value (for external instances)
    { provide: DRIZZLE, useValue: drizzleInstance },
  ],
})
export class MyModule {}
```

## CruzContainer Methods

```typescript
const container = new CruzContainer();

// Load a module
container.loadModule(MyFeatureModule);

// Load multiple modules
container.loadModules([SharedModule, AuthModule, MyFeatureModule]);

// Resolve a service (recommended - uses auto-generated token)
const service = container.resolve(MyService);

// Resolve all implementations (for multi-injection)
const handlers = container.resolveAll(JOB_HANDLER);

// Register a service directly
container.register(MyService);

// Check if a service is registered
const exists = container.isBound(MyService);
```

## Event Listeners

Register event listeners directly in @Module using the `events` option. Multiple listeners can be registered for the same event:

```typescript
import { Module } from '@cruzjs/core';
import { UserRegisteredEvent } from './events/user-registered.event';
import { sendWelcomeEmail } from './listeners/send-welcome-email.listener';
import { createUserProfile } from './listeners/create-profile.listener';

@Module({
  providers: [UserService],
  events: [
    // Multiple listeners for the same event
    { event: UserRegisteredEvent, listener: sendWelcomeEmail },
    { event: UserRegisteredEvent, listener: createUserProfile },
  ],
})
export class UserModule {}
```

Event listeners are simple functions:

```typescript
// listeners/send-welcome-email.listener.ts
import { getAppContainer } from '@cruzjs/core';
import { EmailService } from '@cruzjs/core';
import { UserRegisteredEvent } from '../events/user-registered.event';

export async function sendWelcomeEmail(event: UserRegisteredEvent): Promise<void> {
  const container = await getAppContainer();
  const emailService = container.resolve(EmailService);

  await emailService.sendEmail(
    event.email,
    'Welcome!',
    `<h1>Welcome, ${event.name}!</h1>`
  );
}
```

## Module Lifecycle

```
1. module loaded                 # @Module providers, trpcRouters, events collected
2. boot(container)               # Post-initialization (optional)
```

**Preferred pattern** - use `@Module` for everything, register via `createCruzApp({ modules: [...] })`:
```typescript
@Module({
  providers: [MyService],
  trpcRouters: { myFeature: myTrpc },
  events: [{ event: MyEvent, listener: myListener }],
})
export class MyModule {}

// In server.cloudflare.ts:
export default createCruzApp({
  schema,
  modules: [StartModule, MyModule],
  pages: () => import('virtual:react-router/server-build'),
});
```

## Module Examples

### Core Module (SharedModule)

```typescript
@Module({
  providers: [
    ConfigService,
    CacheServiceFactory,
    StorageService,
    Logger,
    EventEmitterService,
    RouteRegistry,
    { provide: DRIZZLE, useValue: DrizzleService.getDb() },
  ],
})
export class SharedModule {}
```

### Feature Module with tRPC Routers

```typescript
@Module({
  providers: [
    OrgService,
    MemberService,
    InvitationService,
    PermissionService,
  ],
  trpcRouters: {
    org: orgTrpc,
    member: memberTrpc,
    invitation: invitationTrpc,
  },
})
export class OrgModule {}
```

### Module with Multi-Injection

```typescript
@Module({
  providers: [
    JobService,
    JobDispatcher,
    JobRunner,
    JobHandlerRegistry,
    // Multi-injection for job handlers
    { provide: JOB_HANDLER, useClass: SendEmailJobHandler, multi: true },
    { provide: JOB_HANDLER, useClass: EventListenerJobHandler, multi: true },
  ],
})
export class JobModule {}
```

### Module with Events

```typescript
@Module({
  providers: [AuthService, SessionService],
  trpcRouters: { auth: authTrpc },
  events: [
    { event: UserRegisteredEvent, listener: sendWelcomeEmailListener },
  ],
})
export class AuthModule {}
```

## Rules

1. **Always use `@Injectable()`** decorator on service classes
2. **Use `@Inject()`** for constructor parameters (or rely on auto-injection for @Injectable classes)
3. **Bind to singleton scope** for stateless services (default)
4. **Create @Module classes** instead of ContainerModule
5. **Get services via container.resolve()** in routers
6. **Never instantiate services with `new`** - use DI
7. **Register routers in modules** using the `trpcRouters` option
