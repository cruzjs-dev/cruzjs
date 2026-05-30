# Phase 3 — DX & Ergonomics

Reduce boilerplate that every feature currently repeats. No new functionality — better ways to express existing patterns.

**Read before starting:** `.claude/kb/04-DATABASE-DRIZZLE.md`, `.claude/kb/10-TESTING.md`

---

## P3.1 — Relationship Abstractions

**Goal:** `hasMany`, `belongsTo`, and `manyToMany` helpers that produce typed query builders on top of Drizzle. Eliminates repeated join code across every service.

**Why it matters:** Every feature service hand-writes the same join patterns. Without relationship helpers, a `posts` service that needs `author`, `comments`, and `tags` writes 3 separate join queries. This is the biggest source of boilerplate in CruzJS apps.

**Design principle:** These are *query helpers*, not ORM-style magic. They return plain Drizzle queries that callers can `.where()`, `.limit()`, `.orderBy()` further. No lazy-loading, no N+1 surprises — eager loading only, explicit.

**Files to touch:**
- `packages/core/src/database/relations/has-many.ts` — new file
- `packages/core/src/database/relations/belongs-to.ts` — new file
- `packages/core/src/database/relations/many-to-many.ts` — new file
- `packages/core/src/database/relations/index.ts` — new file, exports all
- `packages/core/src/database/index.ts` — re-export from relations

**Implementation steps:**

1. **`hasMany(db, parentTable, childTable, foreignKey)`**:
   ```typescript
   export function hasMany<
     TParent extends Table,
     TChild extends Table,
     TKey extends keyof TChild['_']['columns'],
   >(
     db: CruzDatabase,
     parent: TParent,
     child: TChild,
     foreignKey: TKey,
   ) {
     return {
       // Get all children for a single parent ID
       for(parentId: string): Promise<TChild['$inferSelect'][]>
       
       // Get children for multiple parent IDs, returned as Map<parentId, children[]>
       forMany(parentIds: string[]): Promise<Map<string, TChild['$inferSelect'][]>>
       
       // Chainable: caller can add .where(), .orderBy(), .limit() before executing
       query(parentId: string): DrizzleSelectBuilder<...>
     }
   }
   ```

2. **`belongsTo(db, childTable, parentTable, foreignKey)`**:
   ```typescript
   export function belongsTo<TChild, TParent>(
     db: CruzDatabase,
     child: TChild,
     parent: TParent,
     foreignKey: keyof TChild['_']['columns'],
   ) {
     return {
       // Get parent for a single foreign key value
       for(foreignKeyValue: string): Promise<TParent['$inferSelect'] | null>
       
       // Load parent for multiple foreign key values → Map<fkValue, parent>
       forMany(foreignKeyValues: string[]): Promise<Map<string, TParent['$inferSelect'] | null>>
     }
   }
   ```

3. **`manyToMany(db, sourceTable, pivotTable, targetTable, sourceFk, targetFk)`**:
   ```typescript
   // Get all targets for a source, via the pivot table
   // Returns Map<sourceId, target[]> for batch loading
   ```

4. **Eager loading helper — `withRelations`**:
   ```typescript
   const posts = await db.select().from(postsTable).all();
   const withAuthors = await withRelations(posts, {
     author: belongsTo(db, postsTable, usersTable, 'authorId'),
     tags: manyToMany(db, postsTable, postTagsTable, tagsTable, 'postId', 'tagId'),
   });
   // withAuthors: (Post & { author: User; tags: Tag[] })[]
   ```

5. **Type safety:** Use TypeScript conditional types and template literal types to make foreign key parameter only accept valid column names on the child table. Return types must be `TParent['$inferSelect']` — no `any`.

**Done when:** A service can use `hasMany(db, users, posts, 'authorId').for(userId)` to get all posts by a user. Types are inferred — no casting. `cruz typecheck` passes.

**Test:** Integration test with `createTestDb` + real schema: create a user and 3 posts, assert `hasMany(...).for(userId)` returns 3 posts. Assert `belongsTo(...).for(post.authorId)` returns the user.

---

## P3.2 — Query Scopes

**Goal:** `defineScope` helper that creates reusable, composable WHERE clause builders. Replaces repeated `.where(eq(table.status, 'active'))` calls across services.

**Why it matters:** Every service file repeats the same filter conditions. Soft-delete services filter `isDeleted = false` in every query. Org-scoped services filter `orgId` in every query. Scopes encapsulate these and compose.

**Files to touch:**
- `packages/core/src/database/scopes/define-scope.ts` — new file
- `packages/core/src/database/scopes/index.ts` — new file
- `packages/core/src/database/index.ts` — re-export

**Implementation steps:**

1. **`defineScope<TTable>(table, fn)`**:
   ```typescript
   export function defineScope<TTable extends Table>(
     table: TTable,
     fn: (table: TTable) => SQL | undefined,
   ): Scope<TTable> {
     return { apply: fn };
   }
   
   // Usage:
   const activeScope = defineScope(usersTable, (t) => eq(t.status, 'active'));
   const orgScope = (orgId: string) => defineScope(usersTable, (t) => eq(t.orgId, orgId));
   ```

2. **`applyScopes(query, ...scopes)`** — takes a Drizzle query builder and applies multiple scopes:
   ```typescript
   const users = await applyScopes(
     db.select().from(usersTable),
     activeScope,
     orgScope(ctx.org.orgId),
   ).all();
   ```

3. **Built-in scopes** in `packages/core/src/database/scopes/common-scopes.ts`:
   - `softNotDeleted(table)` — `isNull(table.deletedAt)`
   - `createdAfter(table, date)` — `gte(table.createdAt, date)`
   - `byOrg(table, orgId)` — `eq(table.orgId, orgId)`
   - `byUser(table, userId)` — `eq(table.userId, userId)` or `eq(table.createdById, userId)`

4. **Type safety:** `defineScope<TTable>` only accepts `fn` that references valid columns on `TTable`. Return type of scope application preserves query builder chain type.

**Done when:** Service can write `applyScopes(db.select().from(posts), activeScope, orgScope(orgId))` and get typed results. `cruz typecheck` passes. No `any`.

**Test:** Unit test: define a scope, apply it to a query, execute against `createTestDb`, assert only matching rows returned.

---

## P3.3 — HTTP Testing Layer

**Goal:** `createTestApp(handler)` utility that wraps the Cruz request handler and exposes an HTTP-like API for testing full request/response cycles without starting a server.

**Why it matters:** Currently tests call tRPC procedures directly. That's good for unit tests but misses middleware, auth guards, route matching, and response shape. HTTP tests catch integration bugs that procedure-level tests miss.

**Files to touch:**
- `packages/core/src/testing/test-app.ts` — new file
- `packages/core/src/testing/index.ts` — export

**Implementation steps:**

1. **`createTestApp(handler)`**:
   ```typescript
   export function createTestApp(handler: (req: Request) => Promise<Response>) {
     return {
       get(path: string, options?: RequestInit): TestRequest
       post(path: string, body?: unknown, options?: RequestInit): TestRequest
       put(path: string, body?: unknown, options?: RequestInit): TestRequest
       delete(path: string, options?: RequestInit): TestRequest
       patch(path: string, body?: unknown, options?: RequestInit): TestRequest
       
       // Auth helpers:
       asUser(userId: string): this  // sets Authorization header / session cookie
       asAdmin(userId: string): this
     }
   }
   
   interface TestRequest {
     expect(status: number): this
     expectJson<T = unknown>(): Promise<T>
     expectText(): Promise<string>
     expectHeader(name: string, value: string): this
     // Execute: returns raw Response
     execute(): Promise<Response>
   }
   ```

2. Internally: `createTestApp` wraps the handler function. Each `.get()` / `.post()` constructs a `Request` object and calls `handler(request)`. No TCP connection, no port binding.

3. **`asUser(userId)`**: Creates a test session token (bypasses OAuth, directly creates a session in the test DB) and attaches it as a Cookie header. Requires access to the session service.

4. Helper: `withTestApp(modules, fn)` that wires everything up:
   ```typescript
   await withTestApp([MyModule], async (app) => {
     const data = await app
       .asUser('user-123')
       .get('/trpc/myRouter.list')
       .expect(200)
       .expectJson();
   });
   ```

**Done when:** A test can `await app.asUser(id).get('/trpc/auth.me').expect(200).expectJson()` and get typed user data back. Middleware (auth guard, org scope) runs as in production. `cruz typecheck` passes.

**Test:** Integration test: create user, make authenticated request to `auth.me`, assert response contains user id.

---

## P3.4 — Standalone Named Migration Files

**Goal:** `cruz db generate:migration <name>` creates an empty migration file for data transforms, backfills, or manual SQL that can't be derived from schema diffing.

**Why it matters:** Schema-diff migrations (DDL only) cannot handle data transforms: backfilling a new column, splitting one column into two, migrating data between tables. Currently there's no way to do this without editing generated migration files (which breaks drizzle-kit's tracking).

**Files to touch:**
- `packages/cli/src/commands/db.command.ts` — add `generate:migration` subcommand
- `packages/cli/src/utils/migration-template.ts` — new file, migration file template

**Implementation steps:**

1. Add `generate:migration <name>` subcommand to the `db` command group.

2. **Migration template** written to `apps/web/drizzle/<timestamp>_<name>.sql`:
   ```sql
   -- Migration: <name>
   -- Created: <ISO timestamp>
   -- Type: data (manual)
   
   -- Write your SQL here. This file is tracked by drizzle-kit.
   -- DDL changes should still go through `cruz db generate`.
   -- This file runs in order with schema migrations.
   
   -- Example:
   -- UPDATE users SET display_name = first_name || ' ' || last_name WHERE display_name IS NULL;
   ```

3. The file is a plain `.sql` file in the drizzle migrations directory. Drizzle-kit picks it up alphabetically with other migrations via `cruz db migrate`.

4. CLI output: prints the created file path and reminds the developer to run `cruz db migrate` after editing.

5. Optional: for TypeScript migrations (using the Drizzle db object), generate a `.ts` migration template instead when `--ts` flag is passed:
   ```typescript
   import type { MigrationContext } from '@cruzjs/core/database';
   
   export async function up({ db }: MigrationContext): Promise<void> {
     // await db.update(users).set({ displayName: sql`first_name || ' ' || last_name` });
   }
   ```

**Done when:** `cruz db generate:migration backfill-display-names` creates a timestamped SQL file in the drizzle directory. Running `cruz db migrate` picks it up and applies it. `cruz typecheck` passes.

**Test:** CLI test: run `generate:migration test-migration`, assert file exists with correct timestamp prefix and name. Assert running `migrate` with it doesn't error.
