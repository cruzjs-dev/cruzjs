---
title: Services
description: Creating business logic services with dependency injection in CruzJS.
---

Services encapsulate your application's business logic. They are classes decorated with `@Injectable()` that receive their dependencies (database, other services, event emitter) through constructor injection.

## Creating a service

```ts
// apps/web/src/features/project/project.service.ts
import { Injectable, Inject } from '@cruzjs/core/di';
import { DRIZZLE, type DrizzleDatabase } from '@cruzjs/core/shared/database/drizzle.service';
import { eq, and, desc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { projects } from './project.schema';
import type { CreateProjectInput, UpdateProjectInput, ProjectResponse } from './project.models';

@Injectable()
export class ProjectService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
  ) {}

  async listByOrg(orgId: string): Promise<ProjectResponse[]> {
    const items = await this.db
      .select()
      .from(projects)
      .where(eq(projects.orgId, orgId))
      .orderBy(desc(projects.createdAt));

    return items.map(this.toResponse);
  }

  async getById(id: string): Promise<ProjectResponse | null> {
    const [item] = await this.db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    return item ? this.toResponse(item) : null;
  }

  async create(orgId: string, userId: string, input: CreateProjectInput): Promise<ProjectResponse> {
    const [item] = await this.db
      .insert(projects)
      .values({
        orgId,
        createdById: userId,
        name: input.name,
        description: input.description,
        priority: input.priority,
      })
      .returning();

    return this.toResponse(item);
  }

  async update(id: string, input: UpdateProjectInput): Promise<ProjectResponse> {
    const [item] = await this.db
      .update(projects)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();

    if (!item) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
    }

    return this.toResponse(item);
  }

  async delete(id: string): Promise<void> {
    await this.db
      .delete(projects)
      .where(eq(projects.id, id));
  }

  private toResponse(item: typeof projects.$inferSelect): ProjectResponse {
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      priority: item.priority,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
```

## Injecting the database

Every service that needs database access injects the `DRIZZLE` token:

```ts
import { Injectable, Inject } from '@cruzjs/core/di';
import { DRIZZLE, type DrizzleDatabase } from '@cruzjs/core/shared/database/drizzle.service';

@Injectable()
export class MyService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDatabase) {}
}
```

`DrizzleDatabase` gives you the full Drizzle ORM query builder with your schema types.

## Common CRUD patterns

### Select a single record

```ts
async getById(id: string): Promise<Project | null> {
  const [item] = await this.db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);

  return item ?? null;
}
```

### Select with multiple conditions

```ts
import { eq, and, isNull, desc } from 'drizzle-orm';

async listActive(orgId: string): Promise<Project[]> {
  return this.db
    .select()
    .from(projects)
    .where(and(
      eq(projects.orgId, orgId),
      eq(projects.isActive, true),
      isNull(projects.deletedAt),
    ))
    .orderBy(desc(projects.createdAt));
}
```

### Insert and return

```ts
async create(orgId: string, userId: string, input: CreateInput): Promise<Project> {
  const [item] = await this.db
    .insert(projects)
    .values({
      orgId,
      createdById: userId,
      name: input.name,
    })
    .returning();

  return item;
}
```

### Update

```ts
async update(id: string, input: UpdateInput): Promise<Project | null> {
  const [item] = await this.db
    .update(projects)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();

  return item ?? null;
}
```

### Soft delete

```ts
async softDelete(id: string): Promise<void> {
  await this.db
    .update(projects)
    .set({ deletedAt: new Date() })
    .where(eq(projects.id, id));
}
```

### Transactions

Use transactions when multiple database operations must succeed or fail together:

```ts
async transfer(itemId: string, newOwnerId: string, orgId: string): Promise<void> {
  return this.db.transaction(async (tx) => {
    const [item] = await tx
      .select()
      .from(projects)
      .where(and(eq(projects.id, itemId), eq(projects.orgId, orgId)))
      .limit(1);

    if (!item) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
    }

    await tx
      .update(projects)
      .set({ createdById: newOwnerId, updatedAt: new Date() })
      .where(eq(projects.id, itemId));
  });
}
```

## Formatting responses

Keep a private `toResponse` method that maps database rows to a clean API shape. This prevents leaking internal fields (like soft-delete timestamps or internal IDs) to the client:

```ts
private toResponse(item: typeof projects.$inferSelect): ProjectResponse {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    createdAt: item.createdAt,
  };
}
```

Use it consistently:

```ts
async list(orgId: string): Promise<ProjectResponse[]> {
  const items = await this.db.select().from(projects).where(eq(projects.orgId, orgId));
  return items.map(this.toResponse);
}
```

## Throwing errors

Services throw `TRPCError` when something goes wrong. tRPC serializes these into proper HTTP responses automatically:

```ts
import { TRPCError } from '@trpc/server';

// Resource not found
throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });

// Invalid state
throw new TRPCError({ code: 'BAD_REQUEST', message: 'Project is already archived' });

// Duplicate
throw new TRPCError({ code: 'CONFLICT', message: 'A project with this name already exists' });

// Internal failure
throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to process request' });
```

## Injecting other services

Services can depend on other services. The DI container resolves the full dependency tree automatically:

```ts
import { Injectable, Inject } from '@cruzjs/core/di';
import { DRIZZLE, type DrizzleDatabase } from '@cruzjs/core/shared/database/drizzle.service';
import { EventEmitterService } from '@cruzjs/core/shared/events/event-emitter.service.server';
import { Logger } from '@cruzjs/core';

@Injectable()
export class ProjectService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    @Inject(EventEmitterService) private readonly events: EventEmitterService,
    @Inject(Logger) private readonly logger: Logger,
  ) {}

  async create(orgId: string, userId: string, input: CreateInput): Promise<Project> {
    const [item] = await this.db
      .insert(projects)
      .values({ orgId, createdById: userId, ...input })
      .returning();

    // Dispatch domain event
    await this.events.dispatch(new ProjectCreatedEvent(item.id, orgId));

    this.logger.info('Project created', { projectId: item.id, orgId });

    return item;
  }
}
```

## Registering services in modules

Every service must be registered in a `@Module` so the DI container knows about it:

```ts
// apps/web/src/features/project/project.module.ts
import { Module } from '@cruzjs/core/di';
import { ProjectService } from './project.service';
import { projectRouter } from './project.router';

@Module({
  providers: [ProjectService],
  trpcRouters: {
    project: projectRouter,
  },
})
export class ProjectModule {}
```

Then register the module in `createCruzApp()`:

```ts
// server.cloudflare.ts
import { createCruzApp } from '@cruzjs/core';
import { CloudflareAdapter } from '@cruzjs/adapter-cloudflare';
import * as schema from './database/schema';
import { ProjectModule } from './features/project';

export default createCruzApp({
  schema,
  modules: [ProjectModule],
  adapter: new CloudflareAdapter(),
  pages: () => import('virtual:react-router/server-build'),
});
```

## Service class conventions

Follow this structure for consistency across the codebase:

```ts
@Injectable()
export class ProjectService {
  // 1. Constructor with injected dependencies
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
  ) {}

  // 2. Public methods (alphabetical or logical grouping)
  async create(...) { }
  async delete(...) { }
  async getById(...) { }
  async list(...) { }
  async update(...) { }

  // 3. Private helpers
  private toResponse(...) { }
  private async findByIdOrThrow(...) { }
}
```
