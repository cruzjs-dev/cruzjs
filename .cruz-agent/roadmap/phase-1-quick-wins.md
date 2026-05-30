# Phase 1 — Quick Wins

Low effort, high impact. Closes DX gaps that make the framework feel incomplete.

---

## P1.1 — Email Preview Route

**Goal:** Dev-only route at `/dev/emails` that lists all registered templates and renders any of them with sample data. Developers see email layouts without sending real mail.

**Why it matters:** Currently you must send real emails to verify layout. One of the most common DX pain points in any framework.

**Files to touch:**
- `packages/core/src/email/email-preview.trpc.ts` — new file, tRPC router exposing template list + render
- `packages/core/src/email/email.module.ts` — register preview router in dev mode only
- `apps/web/src/routes/dev.emails.tsx` — new route (React Router), only rendered when `NODE_ENV !== 'production'`
- `apps/web/src/routes/dev.emails.$template.tsx` — renders single template with sample data
- `packages/core/src/email/preview-samples.ts` — sample data per template (auto-generated from `EmailTemplateData` types)

**Implementation steps:**

1. Create `preview-samples.ts` — a `Record<EmailTemplate, EmailTemplateData[T]>` with reasonable fake values for each built-in template. When the registry is extensible (P1.2), apps register their own samples alongside the template.

2. Create `email-preview.trpc.ts` router:
   ```typescript
   // dev-only guard at the top of every procedure:
   if (process.env.NODE_ENV === 'production') throw new TRPCError({ code: 'NOT_FOUND' });
   
   // list: returns array of { name, subject } for all registered templates
   // render: accepts template name + optional override data, returns { html, text }
   ```

3. Register router in `email.module.ts` wrapped in `if (process.env.NODE_ENV !== 'production')`.

4. Add routes to `apps/web/src/routes/`:
   - `dev.emails.tsx` — table of all templates with links
   - `dev.emails.$template.tsx` — iframe showing rendered HTML, tab for text version

5. Guard route component with `if (import.meta.env.PROD) return <Navigate to="/" />`.

**Done when:** `http://localhost:5173/dev/emails` shows list of all templates. Clicking any shows the rendered HTML in a preview pane. Works without sending a real email.

**Test:** Playwright: navigate to `/dev/emails`, assert list items exist, click first template, assert iframe is not empty.

---

## P1.2 — Extensible Email Template Registry

**Goal:** Replace the hardcoded switch statement in `packages/core/src/email/template.service.ts` with a registry that modules can inject into. App developers register custom templates via `@Module` with no core changes.

**Why it matters:** The hardcoded switch (`case 'welcome': ... case 'invitation': ...`) means any app needing a custom email must fork core. This is the same pattern that makes Laravel's Mailable system so much better.

**Files to touch:**
- `packages/core/src/email/email-template.registry.ts` — new file, injectable registry
- `packages/core/src/email/template.service.ts` — rewrite `getTemplateComponent` to use registry
- `packages/core/src/email/email.module.ts` — register built-in templates on module init
- `packages/core/src/email/types.ts` — new `EmailTemplateDefinition` interface
- `packages/core/src/email/index.ts` — export new types

**Implementation steps:**

1. Define `EmailTemplateDefinition<TData>` interface:
   ```typescript
   export interface EmailTemplateDefinition<TData = Record<string, unknown>> {
     name: string;
     subject: string | ((data: TData) => string);  // static or dynamic subject
     component: React.ComponentType<TData>;
     previewData: TData;  // sample data for P1.1 preview route
   }
   ```

2. Create `EmailTemplateRegistry` injectable class:
   ```typescript
   @injectable()
   export class EmailTemplateRegistry {
     private templates = new Map<string, EmailTemplateDefinition>();
     
     register<T>(def: EmailTemplateDefinition<T>): void
     get(name: string): EmailTemplateDefinition | undefined
     all(): EmailTemplateDefinition[]
     has(name: string): boolean
   }
   ```

3. Rewrite `EmailTemplateService.getTemplateComponent` to call `registry.get(template)` and throw if not found. Remove all hardcoded imports of template components from this file.

4. In `email.module.ts`, register the 7 built-in templates on `onInit` using `registry.register()`.

5. Expose `registerEmailTemplate(def)` as a public API in `index.ts` so app modules can call it in their own `onInit`.

6. Keep `EmailTemplate` union type as a convenience for the 7 built-ins. Apps that add custom templates will use `string` type for the template name.

**Migration:** All existing callers of `sendTemplatedEmail('welcome', data)` continue to work — no breaking change. The registry is populated before any emails are sent.

**Done when:** `cruz typecheck` passes. `EmailTemplateService` has zero hardcoded component imports. A test module can register a custom template and render it successfully.

**Test:** Unit test: register custom template, call `renderTemplate('my-custom', data)`, assert HTML contains expected content.

---

## P1.3 — Email Queuing

**Goal:** `sendTemplatedEmail` and `sendEmail` accept `{ queue: true }` option. When set, email is dispatched as a background job instead of blocking the request.

**Why it matters:** Password reset emails shouldn't add 200ms to form submission. Sync email blocks responses and can cause request timeouts on cold starts.

**Files to touch:**
- `packages/core/src/email/email.service.ts` — add `queue` option, dispatch to `JobService`
- `packages/core/src/jobs/handlers/send-email.handler.ts` — new file, job handler that calls `EmailService.sendEmail` synchronously
- `packages/core/src/jobs/job.types.ts` — add `SEND_EMAIL` to job type constants
- `packages/core/src/email/email.module.ts` — register the job handler

**Implementation steps:**

1. Define job payload type:
   ```typescript
   export interface SendEmailJobPayload {
     to: string;
     subject: string;
     html: string;
     text?: string;
     template?: string;
     metadata?: Record<string, unknown>;
   }
   ```

2. Add `queue?: boolean` to `sendEmail` and `sendTemplatedEmail` signatures. When `queue: true`, call `jobService.createJob({ type: 'SEND_EMAIL', payload })` and return immediately (no message ID — return `'queued'`).

3. Create `SendEmailJobHandler` that implements `JobHandler<SendEmailJobPayload>`. It calls `emailService.sendEmail(...)` synchronously (queue=false to avoid recursion).

4. Register handler in `email.module.ts` via `@MultiInject(JOB_HANDLER)`.

5. Add `SEND_EMAIL` to `JobType` constants or just use string literal — whichever the codebase uses.

**Done when:** `sendTemplatedEmail('welcome', data, { queue: true })` returns immediately. The email is sent by the job worker asynchronously. `cruz typecheck` passes.

**Test:** Integration test with `createMailFake()` (P1.4): dispatch queued email, process job manually, assert fake captured the send call.

---

## P1.4 — `createMailFake()` + `createStorageFake()`

**Goal:** Test utilities that replace real email sending and file storage with in-memory fakes. Assert that emails were sent, inspect their content, assert files were stored — all without network calls.

**Why it matters:** Tests that call real services are slow, flaky, and require env vars. Laravel's `Mail::fake()` and `Storage::fake()` are table-stakes for fast test suites.

**Files to touch:**
- `packages/core/src/testing/mail-fake.ts` — new file
- `packages/core/src/testing/storage-fake.ts` — new file
- `packages/core/src/testing/index.ts` — export both

**Implementation steps:**

1. `createMailFake()` returns an object that:
   - Implements the same interface as `EmailSendService` (the Cloudflare Email Workers binding facade)
   - Captures all `send()` calls in `sentEmails: SentEmail[]`
   - Exposes assertion helpers:
     ```typescript
     fake.assertSent(template: string)              // throws if template not in sentEmails
     fake.assertSentTo(email: string)               // throws if email not in to addresses
     fake.assertNotSent()                           // throws if any email was sent
     fake.assertCount(n: number)                    // throws if sentEmails.length !== n
     fake.clear()                                   // reset sentEmails
     ```
   - Usage with `createTestContainer`:
     ```typescript
     const fake = createMailFake();
     const container = createTestContainer([EmailModule], {
       overrides: (c) => c.replace(EmailSendService).toConstantValue(fake),
     });
     ```

2. `createStorageFake()` returns an object that:
   - Implements `R2Bucket` interface (Cloudflare R2 binding)
   - Stores objects in a `Map<string, { body: ArrayBuffer, metadata: R2ObjectMetadata }>`
   - Exposes:
     ```typescript
     fake.assertExists(key: string)
     fake.assertNotExists(key: string)
     fake.get(key: string): ArrayBuffer | null
     fake.keys(): string[]
     ```

3. Export from `packages/core/src/testing/index.ts`.

**Done when:** `createMailFake()` and `createStorageFake()` are importable from `@cruzjs/core/testing`. Test that uses them passes without env vars.

**Test:** Test file: create mail fake, send email through service, assert `fake.assertSentTo('user@example.com')` passes.

---

## P1.5 — `withTestTransaction()` — DB Cleanup Between Tests

**Goal:** Wrap each test (or test suite) in a SQLite transaction that rolls back on completion. Tests get a clean slate without truncating tables or rebuilding the database.

**Why it matters:** `createTestDb` gives an in-memory DB, but tests that share state via factory insertions bleed into each other. Without cleanup, test order matters. This is what Laravel's `RefreshDatabase` and `DatabaseTransactions` traits solve.

**Files to touch:**
- `packages/core/src/testing/test-transaction.ts` — new file
- `packages/core/src/testing/index.ts` — export

**Implementation steps:**

1. Create `withTestTransaction(db, fn)`:
   ```typescript
   export async function withTestTransaction<T>(
     db: CruzDatabase,
     fn: (tx: CruzDatabase) => Promise<T>
   ): Promise<T> {
     // Begin transaction
     // Run fn with the transaction db
     // Always rollback (even on success)
     // Return fn result
   }
   ```

2. For Vitest, expose a `useTestTransaction(getDb)` helper that hooks into `beforeEach`/`afterEach`:
   ```typescript
   export function useTestTransaction(getDb: () => CruzDatabase) {
     let rollback: () => void;
     beforeEach(async () => { /* begin savepoint */ });
     afterEach(async () => { /* rollback to savepoint */ });
   }
   ```

3. SQLite doesn't support nested transactions natively — use SAVEPOINTs (`SAVEPOINT test_tx; ... ROLLBACK TO test_tx; RELEASE test_tx`).

4. Since `CruzDatabase` wraps Drizzle, use `db.transaction()` or drop to `better-sqlite3` raw exec for the savepoint.

**Done when:** Two tests that insert the same unique-constrained row both pass when wrapped in `withTestTransaction`. `cruz typecheck` passes.

**Test:** Vitest: two tests share a `createTestDb`, both insert a row with the same email, neither fails due to unique constraint.

---

## P1.6 — Factory States

**Goal:** `defineFactory` returns a factory with a `.state(name, overrides)` method that creates named variants. `UserFactory.admin()` returns a user with `{ isAdmin: true }` without repeating the base defaults.

**Why it matters:** Every test file currently re-declares the same override objects. Laravel factory states and FactoryBot traits eliminate this repetition.

**Files to touch:**
- `packages/core/src/database/factories/factory.ts` — extend `Factory` interface and `defineFactory` implementation
- `packages/core/src/database/factories/index.ts` — re-export

**Implementation steps:**

1. Extend the `Factory<T>` interface:
   ```typescript
   export interface Factory<T extends Record<string, unknown>> {
     // existing methods...
     build(overrides?: Partial<T>): T;
     buildMany(count: number, overrides?: Partial<T>): T[];
     create<TTable>(db: CruzDatabase, table: TTable, overrides?: Partial<T>): Promise<...>;
     createMany<TTable>(db: CruzDatabase, table: TTable, count: number, overrides?: Partial<T>): Promise<...>;
     
     // new:
     state(name: string, overrides: Partial<T> | (() => Partial<T>)): Factory<T>;
     // plus named state access as dynamic methods — see below
   }
   ```

2. `state(name, overrides)` returns a new `Factory<T>` where `defaults()` merges base defaults with state overrides. The new factory is a full `Factory<T>` — it can be chained.

3. Also store named states on the factory so callers can do `UserFactory.states.admin` instead of having to chain. But keep chainable API as primary.

4. Usage:
   ```typescript
   const UserFactory = defineFactory(() => ({
     id: createId(),
     email: faker.internet.email(),
     isAdmin: false,
   })).state('admin', { isAdmin: true })
     .state('unverified', { emailVerifiedAt: null });
   
   UserFactory.state('admin').build()           // { ..., isAdmin: true }
   UserFactory.state('admin').build({ email: 'a@b.com' })  // merge: admin + override
   await UserFactory.state('admin').create(db, schema.users)
   ```

**Done when:** `defineFactory(...).state('admin', { isAdmin: true }).build()` returns `{ isAdmin: true, ...otherDefaults }`. `cruz typecheck` passes. Types are inferred correctly — no `any`.

**Test:** Unit test: define factory with two states, assert `.state('admin').build().isAdmin === true`, assert base `.build().isAdmin === false`.
