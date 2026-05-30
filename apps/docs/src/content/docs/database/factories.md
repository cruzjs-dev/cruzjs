---
title: Factories
description: Generate typed test and seed data with Faker-powered factory functions.
---

Database factories provide a clean way to generate test data and seed records. CruzJS factories use `@faker-js/faker` for realistic fake data and integrate directly with Drizzle ORM for database insertion.

## Defining a Factory

Use `defineFactory()` with a callback that returns default field values. The callback is invoked on every `build()` or `create()` call, so faker values are unique per instance:

```typescript
import { defineFactory } from '@cruzjs/core/database/factories';
import { faker } from '@faker-js/faker';

export const UserFactory = defineFactory(() => ({
  id: crypto.randomUUID(),
  email: faker.internet.email(),
  name: faker.person.fullName(),
  role: 'MEMBER',
  createdAt: new Date().toISOString(),
}));

export const OrgFactory = defineFactory(() => ({
  id: crypto.randomUUID(),
  name: faker.company.name(),
  slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
}));
```

## Building Records

`build()` and `buildMany()` create plain objects without touching the database:

```typescript
// Single record with random values
const user = UserFactory.build();

// Override specific fields
const admin = UserFactory.build({ role: 'ADMIN', name: 'Admin User' });

// Multiple records
const users = UserFactory.buildMany(5);

// Multiple records with shared overrides
const admins = UserFactory.buildMany(3, { role: 'ADMIN' });
```

## Creating Records in DB

`create()` and `createMany()` insert records into the database using Drizzle's `.insert().values().returning()` and return the full row(s) as stored:

```typescript
import * as schema from '../database/schema';

// Single record
const user = await UserFactory.create(db, schema.users);

// With overrides
const admin = await UserFactory.create(db, schema.users, { role: 'ADMIN' });

// Multiple records
const users = await UserFactory.createMany(db, schema.users, 10);

// Multiple with overrides
const orgMembers = await UserFactory.createMany(db, schema.users, 5, {
  orgId: org.id,
});
```

The `db` parameter accepts a `CruzDatabase` instance (the standard Drizzle database object used throughout CruzJS).

## Overrides

Every factory method accepts an optional `overrides` parameter. Overrides are shallow-merged on top of the defaults:

```typescript
const factory = defineFactory(() => ({
  id: crypto.randomUUID(),
  name: faker.person.fullName(),
  email: faker.internet.email(),
  role: 'MEMBER',
}));

// role is 'ADMIN', everything else is random
const admin = factory.build({ role: 'ADMIN' });

// email is fixed, everything else is random
const user = factory.build({ email: 'specific@example.com' });
```

## Using in Tests

Factories keep test setup concise and focused on what matters:

```typescript
import { describe, it, expect } from 'vitest';
import { UserFactory, OrgFactory } from '../factories';

describe('MemberService', () => {
  it('adds a user to an organization', async () => {
    const db = await createTestDb();

    const org = await OrgFactory.create(db, schema.organizations);
    const user = await UserFactory.create(db, schema.users);

    const member = await memberService.addMember(org.id, user.id, 'MEMBER');

    expect(member.orgId).toBe(org.id);
    expect(member.userId).toBe(user.id);
    expect(member.role).toBe('MEMBER');
  });

  it('prevents duplicate memberships', async () => {
    const db = await createTestDb();

    const org = await OrgFactory.create(db, schema.organizations);
    const user = await UserFactory.create(db, schema.users);

    await memberService.addMember(org.id, user.id, 'MEMBER');

    await expect(
      memberService.addMember(org.id, user.id, 'ADMIN'),
    ).rejects.toThrow();
  });
});
```

## Using in Seed Scripts

Factories are ideal for populating development databases:

```typescript
import { UserFactory, OrgFactory, ProductFactory } from './factories';

export async function seed(db: CruzDatabase) {
  // Create organizations
  const orgs = await OrgFactory.createMany(db, schema.organizations, 3);

  for (const org of orgs) {
    // Create users for each org
    const users = await UserFactory.createMany(db, schema.users, 10, {
      orgId: org.id,
    });

    // Create products
    await ProductFactory.createMany(db, schema.products, 20, {
      orgId: org.id,
      createdById: users[0].id,
    });
  }

  console.log('Seeded 3 orgs, 30 users, 60 products');
}
```

Run with `cruz db seed`.

## Factory Interface

```typescript
interface Factory<T extends Record<string, unknown>> {
  build(overrides?: Partial<T>): T;
  buildMany(count: number, overrides?: Partial<T>): T[];
  create<TTable>(db: CruzDatabase, table: TTable, overrides?: Partial<T>): Promise<TTable['$inferSelect']>;
  createMany<TTable>(db: CruzDatabase, table: TTable, count: number, overrides?: Partial<T>): Promise<TTable['$inferSelect'][]>;
}
```
