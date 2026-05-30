# Feature Modules

Feature modules are the primary extension mechanism. Use `@Module` and register via `createCruzApp({ modules: [...] })`.


## Creating a Module

```typescript
// src/features/notes/notes.module.ts
import { Module } from '@cruzjs/core/di';
import { NotesService } from './notes.service';
import { notesRouter } from './notes.router';

@Module({
  providers: [NotesService],
  trpcRouters: {
    notes: notesRouter,  // Available as trpc.notes.*
  },
})
export class NotesModule {}
```

## Registration

In `server.cloudflare.ts`:

```typescript
import { createCruzApp } from '@cruzjs/core';
import { CloudflareAdapter } from '@cruzjs/adapter-cloudflare';
import { StartModule } from '@cruzjs/start';
import * as schema from './database/schema';
import { NotesModule } from './features/notes';

export default createCruzApp({
  schema,
  modules: [StartModule, NotesModule],
  adapter: new CloudflareAdapter(),
  pages: () => import('virtual:react-router/server-build'),
});
```

## Module Lifecycle

```
1. createCruzApp({ schema, modules, adapter, pages })
   ├── Set database schema
   ├── Create CruzContainer
   ├── Load Core modules (Auth, Email, Job, Upload, Shared)
   ├── Load Start modules (Org, Members, Permissions)
   ├── Load Pro modules (Billing, Admin)
   ├── For each user module:
   │   └── loadModule(ModuleClass)     # @Module providers, routers, events
   └── Boot phase (post-init)
```

## Extending Core Behavior

### User Hydrator

Add custom data to session responses:

```typescript
import { Injectable, Inject } from '@cruzjs/core/di';
import { IUserHydrator, USER_HYDRATOR } from '@cruzjs/core';

@Injectable()
export class UserProfileHydrator implements IUserHydrator {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  async hydrate(identityId: string, email: string) {
    const [profile] = await this.db.select().from(userProfiles)
      .where(eq(userProfiles.id, identityId)).limit(1);
    return { profile: profile ?? null };
  }
}

// Register in module
@Module({
  providers: [
    UserProfileService,
    UserProfileHydrator,
    { provide: USER_HYDRATOR, useClass: UserProfileHydrator },
  ],
})
export class UserProfileModule {}
```

### Custom Job Handlers

```typescript
@Module({
  providers: [
    { provide: JOB_HANDLER, useClass: MyJobHandler, multi: true },
  ],
})
export class MyModule {}
```

### Listening to Core Events

```typescript
import { IdentityCreatedEvent } from '@cruzjs/core';
import { OrganizationCreatedEvent } from '@cruzjs/start/orgs/events';

@Module({
  events: [
    { event: IdentityCreatedEvent, listener: createProfileOnRegistration },
    { event: OrganizationCreatedEvent, listener: setupOrgDefaults },
  ],
})
export class MyModule {}
```

## Complete Feature Structure

```
src/features/blog/
├── index.ts                 # Barrel exports
├── blog.module.ts           # @Module (providers, routers, events)
├── blog.router.ts           # tRPC router
├── blog.service.ts          # @Injectable business logic
├── blog.schema.ts           # Drizzle table
├── blog.validation.ts       # Zod schemas
├── blog.models.ts           # TypeScript types
├── routes/                  # React Router route components
│   ├── index.tsx
│   └── $id.tsx
└── events/                  # Domain events
    ├── index.ts
    └── post-created.event.ts
```

## Rules

1. One module per feature
2. Use `@Module` for providers, routers, and events
3. Never modify `@cruzjs/core`, `@cruzjs/start`, or `@cruzjs/saas` -- extend via modules
4. Keep modules focused -- one responsibility per module
5. Register all modules in `createCruzApp({ modules: [...] })`
