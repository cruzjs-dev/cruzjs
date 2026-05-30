# Database Factories

`defineFactory()` creates typed factory objects for building and inserting test/seed data using `@faker-js/faker`.

Located at `packages/core/src/database/factories/factory.ts`.

## defineFactory()

```typescript
import { defineFactory } from '@cruzjs/core/database/factories';
import { faker } from '@faker-js/faker';

const UserFactory = defineFactory(() => ({
  id: crypto.randomUUID(),
  email: faker.internet.email(),
  name: faker.person.fullName(),
  role: 'MEMBER',
}));
```

The `defaults` callback is invoked on every `.build()` / `.create()` call, so faker values are unique per instance.

## Factory Interface

```typescript
interface Factory<T> {
  build(overrides?: Partial<T>): T;
  buildMany(count: number, overrides?: Partial<T>): T[];
  create<TTable>(db: CruzDatabase, table: TTable, overrides?: Partial<T>): Promise<TTable['$inferSelect']>;
  createMany<TTable>(db: CruzDatabase, table: TTable, count: number, overrides?: Partial<T>): Promise<TTable['$inferSelect'][]>;
}
```

## build() / buildMany()

Plain objects, no database interaction:

```typescript
const user = UserFactory.build();
const admin = UserFactory.build({ role: 'ADMIN' });
const users = UserFactory.buildMany(5);
const admins = UserFactory.buildMany(3, { role: 'ADMIN' });
```

## create() / createMany()

Insert into the database and return the full row(s) via `.returning()`:

```typescript
import * as schema from './schema';

const user = await UserFactory.create(db, schema.users);
const admin = await UserFactory.create(db, schema.users, { role: 'ADMIN' });

const users = await UserFactory.createMany(db, schema.users, 10);
const admins = await UserFactory.createMany(db, schema.users, 3, { role: 'ADMIN' });
```

## Usage in Tests

```typescript
import { describe, it, expect } from 'vitest';
import { UserFactory, OrgFactory } from '../factories';
import { createTestDb } from '../test-helpers';

describe('UserService', () => {
  it('finds user by email', async () => {
    const db = await createTestDb();
    const user = await UserFactory.create(db, schema.users, {
      email: 'test@example.com',
    });

    const found = await userService.findByEmail('test@example.com');
    expect(found?.id).toBe(user.id);
  });
});
```

## Usage in Seed Scripts

```typescript
import { UserFactory, OrgFactory } from './factories';

export async function seed(db: CruzDatabase) {
  const org = await OrgFactory.create(db, schema.organizations);

  await UserFactory.createMany(db, schema.users, 50, {
    orgId: org.id,
  });
}
```

## Defining Related Factories

```typescript
const OrgFactory = defineFactory(() => ({
  id: crypto.randomUUID(),
  name: faker.company.name(),
  slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
}));

const MemberFactory = defineFactory(() => ({
  id: crypto.randomUUID(),
  userId: crypto.randomUUID(),
  orgId: crypto.randomUUID(),
  role: 'MEMBER',
}));
```

Wire them together via overrides:

```typescript
const org = await OrgFactory.create(db, schema.organizations);
const user = await UserFactory.create(db, schema.users);
const member = await MemberFactory.create(db, schema.members, {
  orgId: org.id,
  userId: user.id,
  role: 'ADMIN',
});
```
