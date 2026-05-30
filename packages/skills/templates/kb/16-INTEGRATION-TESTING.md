# Integration Testing

Integration tests verify that multiple layers work together correctly: services, database, tRPC procedures, events, and permissions. They use real DI containers and in-memory SQLite databases instead of mocks.

## When to Use Integration vs Unit Tests

| Use **Unit Tests** when... | Use **Integration Tests** when... |
|---|---|
| Testing pure logic in a service method | Testing a tRPC procedure end-to-end |
| Verifying validation schemas | Verifying org isolation (user A cannot see org B data) |
| Testing policy rules in isolation | Testing that events fire after mutations |
| Testing utility/helper functions | Testing permission enforcement across the stack |
| Mocking the database is sufficient | Testing real SQL queries against schema |

**Rule of thumb:** If you need to mock more than 2 dependencies, write an integration test instead.

## File Naming Convention

```
*.test.ts              # Unit tests (run with `cruz test`)
*.integration.test.ts  # Integration tests (run with `cruz test --integration`)
```

## Full Working Example

```typescript
// features/invoice/invoice.integration.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestContainer, createTestDb, createTestContext, createRouterCaller } from '@cruzjs/core/testing';
import { Module } from '@cruzjs/core/di';
import { Injectable } from '@cruzjs/core/di';
import * as schema from '@/database/schema';
import { InvoiceModule } from './invoice.module';
import { invoiceTrpc } from './invoice.trpc';
import { DRIZZLE } from '@cruzjs/core/shared/database/drizzle.service';

// SQL to create the tables this feature depends on
const migrations = [
  `CREATE TABLE organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE
  )`,
  `CREATE TABLE invoices (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id),
    created_by_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
];

describe('Invoice Integration', () => {
  let db: ReturnType<typeof createTestDb>;
  let container: ReturnType<typeof createTestContainer>;

  beforeEach(() => {
    // Fresh in-memory database for each test
    db = createTestDb(schema, { migrations });

    // Real DI container with the feature module loaded
    container = createTestContainer([InvoiceModule], {
      overrides: (c) => {
        // Swap in the test database
        c.replace(DRIZZLE).toConstantValue(db);
      },
    });
  });

  it('should create and list invoices for the org', async () => {
    const ctx = createTestContext({
      container,
      org: {
        user: { id: 'user-1' },
        session: { token: 'tok', userId: 'user-1', expiresAt: new Date() },
        org: { orgId: 'org-1', userId: 'user-1', role: 'ADMIN' },
      } as any,
    });

    const caller = createRouterCaller(invoiceTrpc, ctx);

    // Create
    const created = await caller.create({ amount: 5000 });
    expect(created.id).toBeDefined();
    expect(created.amount).toBe(5000);

    // List
    const list = await caller.list({});
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(created.id);
  });
});
```

## Testing Org Isolation

Org isolation is critical. Every integration test for org-scoped data should verify that users from one org cannot access another org's data.

```typescript
describe('org isolation', () => {
  it('should not return invoices from another org', async () => {
    // Insert data for org-A
    const ctxOrgA = createTestContext({
      container,
      org: {
        user: { id: 'user-a' },
        session: { token: 'tok', userId: 'user-a', expiresAt: new Date() },
        org: { orgId: 'org-a', userId: 'user-a', role: 'ADMIN' },
      } as any,
    });
    const callerA = createRouterCaller(invoiceTrpc, ctxOrgA);
    await callerA.create({ amount: 1000 });

    // Query as org-B
    const ctxOrgB = createTestContext({
      container,
      org: {
        user: { id: 'user-b' },
        session: { token: 'tok', userId: 'user-b', expiresAt: new Date() },
        org: { orgId: 'org-b', userId: 'user-b', role: 'ADMIN' },
      } as any,
    });
    const callerB = createRouterCaller(invoiceTrpc, ctxOrgB);
    const list = await callerB.list({});

    // org-B should see zero invoices
    expect(list).toHaveLength(0);
  });
});
```

## Testing Events with MockEventEmitter

Use `MockEventEmitter` to verify that domain events are dispatched without running real listeners.

```typescript
import { MockEventEmitter } from '@cruzjs/core/testing';
import { EventEmitterService } from '@cruzjs/core/shared/events/event-emitter.service.server';
import { InvoiceCreatedEvent } from './events/invoice-created.event';

describe('invoice events', () => {
  let mockEmitter: MockEventEmitter;

  beforeEach(() => {
    mockEmitter = new MockEventEmitter();

    container = createTestContainer([InvoiceModule], {
      overrides: (c) => {
        c.replace(DRIZZLE).toConstantValue(db);
        // Swap the real event emitter for the mock
        c.replace(EventEmitterService).toConstantValue(mockEmitter as any);
      },
    });
  });

  it('should dispatch InvoiceCreatedEvent after creating an invoice', async () => {
    const ctx = createTestContext({ container, /* ... */ });
    const caller = createRouterCaller(invoiceTrpc, ctx);

    await caller.create({ amount: 2500 });

    // Assert the event was dispatched
    mockEmitter.assertDispatched(InvoiceCreatedEvent);

    // Inspect the event payload
    const events = mockEmitter.getEvents(InvoiceCreatedEvent);
    expect(events).toHaveLength(1);
    expect(events[0].amount).toBe(2500);
  });

  it('should NOT dispatch events on validation failure', async () => {
    const ctx = createTestContext({ container, /* ... */ });
    const caller = createRouterCaller(invoiceTrpc, ctx);

    await expect(caller.create({ amount: -1 })).rejects.toThrow();

    mockEmitter.assertNotDispatched(InvoiceCreatedEvent);
  });
});
```

## Testing Permission Enforcement

Verify that procedures enforce permissions correctly by asserting FORBIDDEN errors.

```typescript
import { TRPCError } from '@trpc/server';

describe('permission enforcement', () => {
  it('should deny MEMBER from deleting invoices', async () => {
    const memberCtx = createTestContext({
      container,
      org: {
        user: { id: 'user-member' },
        session: { token: 'tok', userId: 'user-member', expiresAt: new Date() },
        org: { orgId: 'org-1', userId: 'user-member', role: 'MEMBER' },
      } as any,
    });

    const caller = createRouterCaller(invoiceTrpc, memberCtx);

    try {
      await caller.delete({ id: 'invoice-1' });
      expect.fail('Expected FORBIDDEN error');
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe('FORBIDDEN');
    }
  });

  it('should allow ADMIN to delete invoices', async () => {
    const adminCtx = createTestContext({
      container,
      org: {
        user: { id: 'user-admin' },
        session: { token: 'tok', userId: 'user-admin', expiresAt: new Date() },
        org: { orgId: 'org-1', userId: 'user-admin', role: 'ADMIN' },
      } as any,
    });

    const caller = createRouterCaller(invoiceTrpc, adminCtx);
    // Should not throw
    await expect(caller.delete({ id: 'invoice-1' })).resolves.toBeDefined();
  });
});
```

## Test Data Setup Patterns

### Factory Functions

Create domain-specific factories for consistent test data:

```typescript
// features/invoice/testing/factories.ts
import { createId } from '@paralleldrive/cuid2';

export const createTestInvoice = (overrides: Partial<Invoice> = {}) => ({
  id: createId(),
  orgId: 'org_test_123',
  createdById: 'user_test_123',
  amount: 1000,
  status: 'DRAFT' as const,
  createdAt: new Date(),
  ...overrides,
});
```

### Direct Database Seeding

For integration tests, seed directly via Drizzle:

```typescript
beforeEach(async () => {
  // Insert prerequisite data
  await db.insert(organizations).values({
    id: 'org-1',
    name: 'Test Org',
    slug: 'test-org',
  });

  // Insert test invoices
  await db.insert(invoices).values([
    createTestInvoice({ orgId: 'org-1', amount: 500 }),
    createTestInvoice({ orgId: 'org-1', amount: 1500 }),
  ]);
});
```

### Context Helpers

Build reusable context factories for your test suite:

```typescript
function orgContext(orgId: string, userId: string, role = 'ADMIN') {
  return createTestContext({
    container,
    org: {
      user: { id: userId },
      session: { token: 'tok', userId, expiresAt: new Date(Date.now() + 86400000) },
      org: { orgId, userId, role },
    } as any,
  });
}
```

## Running Tests

```bash
# Run all unit tests (*.test.ts, excludes *.integration.test.ts)
cruz test

# Run only integration tests (*.integration.test.ts)
cruz test --integration

# Run a specific integration test file
npx vitest run path/to/feature.integration.test.ts

# Watch mode for integration tests
cruz test --integration --watch

# Run all tests (unit + integration)
npx vitest run
```

## Best Practices

1. **One database per test** -- Use `beforeEach` to create a fresh `createTestDb` so tests are fully isolated
2. **Test the contract, not internals** -- Call tRPC procedures, not service methods directly
3. **Always test org isolation** -- For every org-scoped feature, write at least one cross-org test
4. **Keep integration tests focused** -- Each test should verify one behavior; use setup helpers to reduce noise
5. **Mock external services only** -- Use real DI, real DB, but mock HTTP clients, email senders, etc.
6. **Name files clearly** -- `invoice.integration.test.ts` makes it obvious what kind of test it is
