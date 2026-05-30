---
title: Database Tests
description: Testing database queries with CruzJS test helpers, seeding test data, and the transaction rollback pattern.
---

Database tests verify that your Drizzle queries work correctly against a real database. CruzJS provides test helpers that spin up a fast in-memory database instance, so you never need to manage driver dependencies or connection setup yourself.

## Test Database Setup

CruzJS ships framework-level test utilities that handle database creation, schema application, and teardown:

```typescript
import { createTestDb, closeTestDb, getTestDb } from '@cruzjs/core/testing';
import type { CruzDatabase } from '@cruzjs/core';
```

- **`createTestDb()`** -- Creates a fresh in-memory database with all schema tables applied. Returns a `CruzDatabase` instance.
- **`getTestDb()`** -- Returns the current test database instance (throws if not initialized).
- **`closeTestDb()`** -- Tears down the database and releases resources.

No manual driver installation or configuration is required. The test helpers use an in-memory SQLite backend for speed, but your test code interacts exclusively with the `CruzDatabase` type, keeping it portable.

## Using the Test Database

```typescript
// src/features/projects/project.service.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { createTestDb, closeTestDb } from '@cruzjs/core/testing';
import type { CruzDatabase } from '@cruzjs/core';
import { OrgService } from '@cruzjs/start/orgs/org.service';
import { createTestUser } from 'tests/factories/user.factory';
import { authIdentity } from '@cruzjs/core/database/schema';

describe('OrgService (database)', () => {
  let db: CruzDatabase;
  let orgService: OrgService;

  beforeEach(() => {
    db = createTestDb();
    orgService = new OrgService(db);
  });

  afterAll(() => {
    closeTestDb();
  });

  it('should create an organization with auto-generated slug', async () => {
    // Seed a user first
    const user = createTestUser();
    await db.insert(authIdentity).values(user);

    // Create org
    const org = await orgService.createOrg(
      { name: 'Acme Corporation' },
      user.id
    );

    expect(org.name).toBe('Acme Corporation');
    expect(org.slug).toBe('acme-corporation');
  });

  it('should generate unique slugs for duplicate names', async () => {
    const user = createTestUser();
    await db.insert(authIdentity).values(user);

    const org1 = await orgService.createOrg({ name: 'Test Org' }, user.id);
    const org2 = await orgService.createOrg({ name: 'Test Org' }, user.id);

    expect(org1.slug).toBe('test-org');
    expect(org2.slug).toMatch(/^test-org-\d+$/);
  });

  it('should soft delete organizations', async () => {
    const user = createTestUser();
    await db.insert(authIdentity).values(user);

    const org = await orgService.createOrg({ name: 'To Delete' }, user.id);
    await orgService.deleteOrg(org.id);

    // Should not appear in normal queries
    const result = await orgService.getOrg(org.id);
    expect(result).toBeNull();
  });
});
```

## Seeding Test Data

Create seed functions for complex test scenarios:

```typescript
// tests/fixtures/seed.ts
import type { CruzDatabase } from '@cruzjs/core';
import { authIdentity } from '@cruzjs/core/database/schema';
import { organizations, orgMembers } from '@cruzjs/saas/database/schema';
import { createTestUser } from '../factories/user.factory';
import { createTestOrg } from '../factories/org.factory';

type SeedResult = {
  users: ReturnType<typeof createTestUser>[];
  orgs: ReturnType<typeof createTestOrg>[];
};

export async function seedTestData(db: CruzDatabase): Promise<SeedResult> {
  // Create users
  const owner = createTestUser({ email: 'owner@test.com', name: 'Owner' });
  const admin = createTestUser({ email: 'admin@test.com', name: 'Admin' });
  const member = createTestUser({ email: 'member@test.com', name: 'Member' });

  await db.insert(authIdentity).values([owner, admin, member]);

  // Create organization
  const org = createTestOrg({ name: 'Test Organization', ownerId: owner.id });
  await db.insert(organizations).values(org);

  // Create memberships
  const now = new Date().toISOString();
  await db.insert(orgMembers).values([
    { id: 'mem-1', orgId: org.id, userId: owner.id, role: 'OWNER', createdAt: now, updatedAt: now },
    { id: 'mem-2', orgId: org.id, userId: admin.id, role: 'ADMIN', createdAt: now, updatedAt: now },
    { id: 'mem-3', orgId: org.id, userId: member.id, role: 'MEMBER', createdAt: now, updatedAt: now },
  ]);

  return {
    users: [owner, admin, member],
    orgs: [org],
  };
}
```

Use in tests:

```typescript
describe('PermissionService', () => {
  let db: CruzDatabase;
  let seed: SeedResult;

  beforeEach(async () => {
    db = createTestDb();
    seed = await seedTestData(db);
  });

  it('owner should have all permissions', async () => {
    const permService = new PermissionService(db);
    const hasPermission = await permService.hasPermission(
      seed.users[0].id,
      seed.orgs[0].id,
      'org:delete'
    );
    expect(hasPermission).toBe(true);
  });

  it('member should not have write permissions', async () => {
    const permService = new PermissionService(db);
    const hasPermission = await permService.hasPermission(
      seed.users[2].id,
      seed.orgs[0].id,
      'org:write'
    );
    expect(hasPermission).toBe(false);
  });
});
```

## Transaction Rollback Pattern

For tests that modify data, use `db.transaction()` to roll back changes after assertions. Throwing inside the transaction callback causes an automatic rollback:

```typescript
describe('MemberService (with rollback)', () => {
  let db: CruzDatabase;

  beforeAll(() => {
    db = createTestDb();
  });

  afterAll(() => {
    closeTestDb();
  });

  it('should add a member', async () => {
    await db.transaction(async (tx) => {
      const memberService = new MemberService(tx);
      const member = await memberService.addMember('org-1', 'new-user', 'MEMBER');
      expect(member.role).toBe('MEMBER');
      throw new Error('rollback'); // roll back after assertions
    }).catch(() => {});
  });

  it('should start fresh (previous test changes rolled back)', async () => {
    const memberService = new MemberService(db);
    const member = await memberService.getMember('org-1', 'new-user');
    expect(member).toBeNull();
  });
});
```

Alternatively, recreate the database in `beforeEach` for full isolation without transactions:

```typescript
beforeEach(() => {
  closeTestDb();
  db = createTestDb();
});
```

This is simpler but slightly slower for large schemas. Choose the approach that fits your test suite.

## Testing Queries

Verify that queries return expected results:

```typescript
describe('query patterns', () => {
  it('should filter by date range', async () => {
    // Insert test data with specific dates
    await db.insert(auditLogs).values([
      { ...baseLog, createdAt: '2024-01-15T00:00:00Z' },
      { ...baseLog, createdAt: '2024-02-15T00:00:00Z' },
      { ...baseLog, createdAt: '2024-03-15T00:00:00Z' },
    ]);

    const service = new AuditLogService(db);
    const { logs } = await service.getAuditLogs('org-1', {
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-02-28'),
    });

    expect(logs).toHaveLength(1);
    expect(logs[0].createdAt.toISOString()).toContain('2024-02');
  });

  it('should handle pagination', async () => {
    // Insert 25 records
    const records = Array.from({ length: 25 }, (_, i) => ({
      ...baseLog,
      id: `log-${i}`,
    }));
    await db.insert(auditLogs).values(records);

    const service = new AuditLogService(db);

    const page1 = await service.getAuditLogs('org-1', { limit: 10, skip: 0 });
    expect(page1.logs).toHaveLength(10);
    expect(page1.total).toBe(25);

    const page2 = await service.getAuditLogs('org-1', { limit: 10, skip: 10 });
    expect(page2.logs).toHaveLength(10);

    const page3 = await service.getAuditLogs('org-1', { limit: 10, skip: 20 });
    expect(page3.logs).toHaveLength(5);
  });
});
```

## Testing Migrations

Migration testing is best done against the local database using the CruzJS CLI rather than programmatically:

```bash
# Reset the local database and re-apply all migrations from scratch
cruz db hard-reset && cruz db migrate
```

This verifies that every migration file applies cleanly in sequence. You can also run individual migration SQL files against a local test database for more targeted checks.

For CI pipelines, add the migration check as a step before running your test suite to catch schema issues early.

## Next Steps

- [Unit Tests](/testing/unit-tests) -- Testing services in isolation
- [E2E Tests](/testing/e2e-tests) -- Browser-based testing
- [Testing Overview](/testing/getting-started) -- Strategy and CLI
