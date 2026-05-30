---
title: "03 — First Feature"
description: Generate the tasks feature module, understand each file, and call the tRPC endpoint.
---

# Chapter 03 — First Feature

Use the scaffold command to generate a complete CRUD feature module, then walk through every generated file.

## Generate the feature

```bash
cruz new feature tasks --scope org --crud --wire
```

- `--scope org` — all data is org-scoped (uses `orgProcedure`)
- `--crud` — generates create/read/update/delete tRPC procedures
- `--wire` — auto-registers the module in `app.server.ts`

This creates:

```
packages/core/src/tasks/
├── tasks.module.ts        # DI container module
├── tasks.service.ts       # Business logic
├── tasks.trpc.ts          # tRPC router
├── tasks.validation.ts    # Zod schemas
└── index.ts               # Barrel export
```

## The service

```typescript
// packages/core/src/tasks/tasks.service.ts
@injectable()
export class TasksService {
  constructor(@inject(DRIZZLE) private readonly db: DrizzleDatabase) {}

  async listByOrg(orgId: string) {
    return this.db.select().from(tasks).where(eq(tasks.orgId, orgId));
  }

  async create(orgId: string, input: CreateTaskInput) {
    const id = createId();
    const now = new Date().toISOString();
    await this.db.insert(tasks).values({ id, orgId, ...input, createdAt: now, updatedAt: now });
    return this.db.select().from(tasks).where(eq(tasks.id, id)).get();
  }

  async update(id: string, orgId: string, input: UpdateTaskInput) {
    await this.db.update(tasks)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(and(eq(tasks.id, id), eq(tasks.orgId, orgId)));
  }

  async delete(id: string, orgId: string) {
    await this.db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.orgId, orgId)));
  }
}
```

Notice: every write checks `orgId` — an org can never accidentally touch another org's data.

## The tRPC router

```typescript
// packages/core/src/tasks/tasks.trpc.ts
@Router()
export class TasksRouter {
  constructor(@inject(TASKS_SERVICE) private readonly service: TasksService) {}

  @TrpcRouter()
  router(t: TrpcContext) {
    return {
      list: t.orgProcedure.query(({ ctx }) =>
        this.service.listByOrg(ctx.org.id)
      ),
      create: t.orgProcedure.input(CreateTaskSchema).mutation(({ ctx, input }) =>
        this.service.create(ctx.org.id, input)
      ),
      update: t.orgProcedure.input(UpdateTaskSchema).mutation(({ ctx, input }) =>
        this.service.update(input.id, ctx.org.id, input)
      ),
      delete: t.orgProcedure.input(z.object({ id: z.string() })).mutation(({ ctx, input }) =>
        this.service.delete(input.id, ctx.org.id)
      ),
    };
  }
}
```

`orgProcedure` automatically reads `ctx.org.id` from the session — you never pass the org ID manually from the client.

## The module

```typescript
// packages/core/src/tasks/tasks.module.ts
@Module({
  providers: [
    { provide: TASKS_SERVICE, useClass: TasksService },
    { provide: TASKS_ROUTER, useClass: TasksRouter },
  ],
  routers: [TASKS_ROUTER],
})
export class TasksModule {}
```

Modules declare their providers and routers. The framework registers everything at startup.

## Call the endpoint from the console

Start the dev server (`cruz dev`) then open the browser console on any page. The tRPC client is available as `window.__trpc` in development:

```javascript
await window.__trpc.tasks.list.query()
// → []
```

Or use `cruz console` for a Node.js REPL with the full DI container:

```bash
cruz console
> await container.get(TasksService).listByOrg('my-org-id')
```

## What we built

- Complete CRUD feature module with DI, service, tRPC router, and Zod validation
- Understood the pattern: module → service → router → client

**Next:** [Chapter 04 — Authentication](/tutorial/04-authentication/)
