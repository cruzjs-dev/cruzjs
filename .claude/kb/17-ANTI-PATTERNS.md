# CruzJS Anti-Patterns

Common mistakes that cause data leaks, auth bypasses, and runtime failures.
Every item below includes ❌ wrong code and ✅ right code.

---

## 1. Querying Without Org Scope Filter

**Risk: Cross-tenant data leak.** The most dangerous mistake in a multi-tenant app.

❌ Wrong — returns ALL records across every organization:
```typescript
async list(): Promise<Invoice[]> {
  return this.db.select().from(invoices); // every org's invoices
}
```

✅ Right — scoped to the current org:
```typescript
async list(orgId: string): Promise<Invoice[]> {
  return this.db.select().from(invoices).where(eq(invoices.orgId, orgId));
}

// In tRPC:
orgProcedure.query(async ({ ctx }) => {
  return this.invoicesService.list(ctx.org.orgId);
});
```

Every org-scoped table query **must** include `.where(eq(table.orgId, orgId))`.
There is no middleware enforcing this — it is your responsibility.

---

## 2. Forgetting Soft-Delete Filter

**Risk: Deleted records appearing in results.** Confuses users and may violate compliance requirements.

❌ Wrong — returns soft-deleted records too:
```typescript
return this.db.select().from(invoices).where(eq(invoices.orgId, orgId));
```

✅ Right — filter out deleted records:
```typescript
import { and, eq, isNull } from 'drizzle-orm';

return this.db
  .select()
  .from(invoices)
  .where(and(eq(invoices.orgId, orgId), isNull(invoices.deletedAt)));
```

If your table has a `deletedAt` column, every `select` query must add `isNull(table.deletedAt)` unless you explicitly want to include deleted records (e.g. admin restore UI).

---

## 3. Instantiating Services with `new`

**Risk: Breaks dependency injection chain.** Services created with `new` don't have their own `@inject()` dependencies resolved.

❌ Wrong:
```typescript
// In a tRPC router or another service
const emailService = new EmailService(); // EmailService's own deps won't be injected
await emailService.sendWelcome(user);
```

✅ Right — resolve from the DI container:
```typescript
@Router()
export class UsersTrpc extends TrpcRouter {
  @Inject(EmailService) private emailService!: EmailService;
  // EmailService is fully initialized with all its own dependencies
}
```

Or from context in a procedure:
```typescript
orgProcedure.mutation(async ({ ctx }) => {
  const emailService = ctx.container.resolve(EmailService);
  await emailService.sendWelcome(user);
});
```

---

## 4. Importing Server-Only Code in Client Components

**Risk: Hard runtime crash in the browser.** Modules that import `drizzle-orm`, `better-sqlite3`, Inversify, or Node.js APIs will break in the browser.

❌ Wrong — client component importing server code:
```typescript
// apps/web/src/routes/invoices._index.tsx (runs in browser)
import { InvoicesService } from '../features/invoices/invoices.service'; // server-only!
import { db } from '../database/db'; // Drizzle — Node.js only!
```

✅ Right — client only uses tRPC hooks:
```typescript
// apps/web/src/routes/invoices._index.tsx
import { trpc } from '@/trpc/client';

export default function InvoicesPage() {
  const { data } = trpc.invoices.list.useQuery();
  // ...
}
```

Service files should have `import 'server-only'` at the top to make this fail at build time instead of runtime.

---

## 5. Using `protectedProcedure` for Org-Scoped Data

**Risk: Missing org context — `ctx.org` will be undefined.** `protectedProcedure` only provides `ctx.session`. `orgProcedure` provides `ctx.session` + `ctx.org`.

❌ Wrong:
```typescript
// protectedProcedure does NOT have ctx.org
protectedProcedure.query(async ({ ctx }) => {
  return service.list(ctx.org.orgId); // TypeError: Cannot read property 'orgId' of undefined
});
```

✅ Right:
```typescript
// org-scoped data → always use orgProcedure
orgProcedure.query(async ({ ctx }) => {
  await requirePermission(ctx.org, 'invoice:read');
  return service.list(ctx.org.orgId);
});
```

**Rule:** If the data has an `orgId` column, use `orgProcedure`. If it has `userId` only, use `protectedProcedure`. If it's public, use `publicProcedure`.

---

## 6. Forgetting `requirePermission()` on Org Mutations

**Risk: Any org member (including VIEWER) can perform privileged mutations.**

❌ Wrong — no permission check:
```typescript
orgProcedure
  .input(deleteInvoiceSchema)
  .mutation(async ({ ctx, input }) => {
    await this.invoicesService.delete(input.id, ctx.org.orgId);
    // Any org member can delete!
  });
```

✅ Right:
```typescript
orgProcedure
  .input(deleteInvoiceSchema)
  .mutation(async ({ ctx, input }) => {
    await requirePermission(ctx.org, 'invoice:delete');
    await this.invoicesService.delete(input.id, ctx.org.orgId);
  });
```

Or use `orgMutation('invoice:delete')` which bakes the permission check in:
```typescript
orgMutation('invoice:delete')
  .input(deleteInvoiceSchema)
  .mutation(async ({ ctx, input }) => {
    await this.invoicesService.delete(input.id, ctx.org.orgId);
  });
```

---

## 7. Not Exporting Schema from `database/schema.ts`

**Risk: Drizzle migration runner silently ignores your table.** Migrations won't be generated. The table won't exist in production.

❌ Wrong — table defined but not exported from the schema barrel:
```typescript
// apps/web/src/features/invoices/invoices.schema.ts — table defined here
// apps/web/src/database/schema.ts — does NOT re-export it
```

✅ Right — every feature schema must be re-exported:
```typescript
// apps/web/src/database/schema.ts
export * from '../features/invoices/invoices.schema';
export * from '../features/products/products.schema';
// every table must appear here for cruz db generate to pick it up
```

After adding: `cruz db generate && cruz db migrate`.

---

## 8. Registering Module in Only One Place

**Risk: DI works but routes 404 (or vice versa).** Modules must be registered in **both** `registerModules` (for DI/tRPC) and `createCruzRoutes` (for page routes).

❌ Wrong — registered via `registerModules` but not `createCruzRoutes`:
```typescript
// src/app.server.ts
registerModules([InvoicesModule, StartModule]); // ✓ DI works

// src/routes.ts
createCruzRoutes({ modules: [StartModule] }); // ✗ InvoicesModule missing — routes 404
```

✅ Right — same module list in both (or use `createCruzRoutes` with no modules arg, which auto-reads from the module registry populated by `registerModules`):
```typescript
// src/routes.ts
createCruzRoutes({
  // modules omitted — automatically uses what registerModules registered
  layout: RootLayout,
});
```

---

## 9. Mutable State in Singleton Services

**Risk: Race conditions. State from one request bleeds into another.**

All services decorated with `@injectable()` in `inSingletonScope()` share a single instance across requests. **Never store request-specific state in instance properties.**

❌ Wrong:
```typescript
@injectable()
export class InvoicesService {
  private currentOrgId: string; // SHARED across requests — race condition!

  async setOrg(orgId: string) { this.currentOrgId = orgId; }
  async list() { return db.select().from(invoices).where(eq(invoices.orgId, this.currentOrgId)); }
}
```

✅ Right — pass scope as parameters:
```typescript
@injectable()
export class InvoicesService {
  async list(orgId: string) { // orgId passed per call, never stored
    return this.db.select().from(invoices).where(eq(invoices.orgId, orgId));
  }
}
```

---

## 10. Returning Raw DB Rows from tRPC

**Risk: Exposing internal columns, inconsistent API shape, breaking clients when schema changes.**

❌ Wrong:
```typescript
orgProcedure.query(async ({ ctx }) => {
  return this.db.select().from(invoices).where(...); // returns raw DB row with ALL columns
});
```

✅ Right — define a response model and pick explicit fields:
```typescript
// invoices.models.ts
export type InvoiceResponse = {
  id: string;
  name: string;
  total: number;
  status: 'draft' | 'sent' | 'paid';
  createdAt: Date;
};

// invoices.service.ts
async list(orgId: string): Promise<InvoiceResponse[]> {
  const rows = await this.db.select({
    id: invoices.id,
    name: invoices.name,
    total: invoices.total,
    status: invoices.status,
    createdAt: invoices.createdAt,
  }).from(invoices).where(eq(invoices.orgId, orgId));
  return rows;
}
```

Or use a `Resource` class with `createCrud`'s `resource` config for automatic serialization.

---

## 11. @cruzjs/ui Not Bundled for SSR

**Risk: Broken styles or missing components on first load (before React hydration).**

**Root cause:** Vite may pre-bundle `@cruzjs/ui` with browser conditions for its client-side optimizeDeps cache. During SSR, the package can be loaded as a Node.js external, creating separate module instances.

❌ Wrong — leaves `@cruzjs/ui` as SSR external (Vite default):
```typescript
ssr: {
  noExternal: ['inversify'],
}
```

✅ Right — force `@cruzjs/*` into the SSR bundle so they share one module instance:
```typescript
ssr: {
  noExternal: isBuild
    ? ['inversify', /^@cruzjs\//, /^@react-router\//]
    : ['inversify', /^@cruzjs\//],
}
```

**Symptom checklist:**
- Components render without correct styling on first page load
- Styles fix themselves after React hydrates (brief FOUC)

---

## 12. Missing Indexes on Foreign Key Columns

**Risk: Full table scans on every query.** As tables grow, unindexed FK columns cause serious performance degradation with no immediate warning.

❌ Wrong:
```typescript
export const invoices = pgTable('Invoice', {
  id: text('id').primaryKey(),
  orgId: text('orgId').notNull().references(() => organizations.id), // no index!
  userId: text('userId').notNull().references(() => identities.id),  // no index!
});
```

✅ Right — always index FK columns and columns used in WHERE clauses:
```typescript
export const invoices = pgTable('Invoice', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  orgId: text('orgId').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: text('userId').notNull().references(() => identities.id),
  status: text('status', { enum: ['draft', 'sent', 'paid'] }).notNull().default('draft'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => ({
  orgIdIdx: index('Invoice_orgId_idx').on(table.orgId),   // ← required
  userIdIdx: index('Invoice_userId_idx').on(table.userId), // ← required
}));
```

**Rule:** Every column that appears in a `.references()` call or in a `.where()` clause needs an index.
