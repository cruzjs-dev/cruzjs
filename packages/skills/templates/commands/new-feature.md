# /new-feature

Create a feature module. Can be full-stack (backend + UI) or backend-only.

## Required Input

- **Name**: Domain name (e.g., `task`, `project`, `comment`)
- **Scope**: `user` (user-specific) or `org` (org-scoped)
- **Fields**: List of fields with types
- **Mode**: `full` (default, backend + UI) or `backend` (API only, no UI)

## Reference Docs

Read before writing any code:

- `.claude/kb/08-DATA-OWNERSHIP.md` — **CRITICAL**: User vs org scoping
- `.claude/kb/03-DI-INVERSIFY.md` — DI patterns
- `.claude/kb/04-DATABASE-DRIZZLE.md` — Schema patterns
- `.claude/kb/05-TRPC-ROUTERS.md` — Router patterns
- `.claude/kb/11-FRAMEWORK-EXTENSIBILITY.md` — Service Provider pattern
- `.claude/kb/07-UI-PATTERNS.md` — UI patterns (full mode only)

## Implementation Order

### Phase 1: Database & Schema

1. **Drizzle Schema** — Add to `apps/web/src/database/schema.ts`
   - Use `createId()` from `@paralleldrive/cuid2` for IDs
   - Org-scoped: `orgId` + `createdById` foreign keys
   - User-specific: `userId` foreign key only
   - Always: `createdAt`, `updatedAt` timestamps
   - Add indexes on all foreign keys

2. **Migrations**
   ```bash
   cruz db generate
   cruz db migrate
   ```

### Phase 2: Domain Logic

3. **Validation** — `apps/web/src/features/<name>/<name>.validation.ts`
   - Zod schemas for create/update inputs

4. **Models** — `apps/web/src/features/<name>/<name>.models.ts`
   - Response type aliases

5. **Service** — `apps/web/src/features/<name>/<name>.service.ts`
   - `@injectable()` decorator
   - `@inject(DRIZZLE) private readonly db: DrizzleDatabase`
   - CRUD methods: `list`, `get`, `create`, `update`, `delete`
   - Org-scoped: all methods take `orgId` as first param
   - User-specific: all methods take `userId` as first param
   - **Always filter by ownership** — never return unfiltered results

6. **Container** — `apps/web/src/features/<name>/<name>.container.ts`
   - Bind service with `.inSingletonScope()`

7. **Router** — `apps/web/src/features/<name>/<name>.trpc.ts`
   - Org-scoped: `orgProcedure` + `requirePermission()`
   - User-specific: `protectedProcedure`
   - Audit logging on mutations (org-scoped)

### Phase 3: Service Provider

8. **Module** — `apps/web/src/features/<name>/<name>.module.ts`
   - `@Module({ providers: [...], routers: { <name>: <name>Trpc }, routes: <name>Routes })`

9. **Routes** — `apps/web/src/features/<name>/<name>.routes.ts`
   - Export `function <name>Routes(helpers: CruzRouteHelpers)` with `prefix`/`index`/`route` calls
   - Route files live in `features/<name>/routes/`, named `<name>._index.tsx`, `<name>.$id.tsx`, etc.

10. **Provider** — `apps/web/src/features/<name>/<name>.provider.ts`
    - Minimal: `export const <Name>Provider: ServiceProvider = { module: <Name>Module };`
    - Add `boot()` only if initialization logic is needed

11. **Register** — Add module to `apps/web/src/entry.server.tsx` + `routes.ts`
    - `entry.server.tsx`: `registerProvider(<Name>Provider)`
    - `routes.ts`: add `<Name>Module` to `modules: [...]` in `createCruzRoutes`

### Phase 4: UI (full mode only)

12. **Route files** — `apps/web/src/features/<name>/routes/<name>._index.tsx` (and others)
    - Default export
    - Org routes: `useOutletContext<OrgContext>()`

13. **Components** — `apps/web/src/components/<name>/`
    - `export const` named exports
    - tRPC hooks for data
    - Loading, error, empty states
    - Permission-based visibility (`canManage`)

14. **Modal** — `apps/web/src/components/<name>/Create<Name>Modal.tsx`
    - `Dialog` from `@cruzjs/ui`
    - `open`, `onOpenChange`, `onSuccess` props

## Key Patterns

### Org-Scoped Data

```typescript
// Schema: orgId + createdById
// Router: orgProcedure + requirePermission('resource:read/write')
// Service: filter by eq(table.orgId, orgId)
// Route: /orgs/:slug/<name>
// Component: useOutletContext<OrgContext>()
```

### User-Specific Data

```typescript
// Schema: userId
// Router: protectedProcedure
// Service: filter by eq(table.userId, userId)
// Route: /<name>
// Component: userId from session (no org context)
```

## Example

> Create a full-stack org-scoped feature called "task" with fields: title (required string), description (optional string), status (enum: TODO, IN_PROGRESS, DONE), dueDate (optional date)

> Create a backend-only user-specific feature called "api-key" with fields: name (string), keyHash (string), lastUsedAt (optional timestamp)
