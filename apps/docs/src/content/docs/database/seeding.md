---
title: Seeding
description: Populating your database with development and test data using the CruzJS seed command.
---

Database seeding populates your database with initial data for development and testing. CruzJS provides the `cruz db seed` command, which runs the seed script at `apps/web/src/database/seed.ts`.

## Running seeds

```bash
cruz db seed
```

This executes `npx tsx apps/web/src/database/seed.ts` from the project root. The seed script connects to your local database and inserts data using the same Drizzle API your services use.

## Creating a seed file

The seed file is a standalone TypeScript script that initializes a database connection and inserts records. Here's a complete example:

```typescript
// apps/web/src/database/seed.ts
import { createSeedClient } from '@cruzjs/core/database';
import { createId } from '@paralleldrive/cuid2';
import * as schema from './schema';

// createSeedClient connects to your local database automatically
// On Cloudflare adapter: local D1 via Wrangler
// On other adapters: DATABASE_URL from .env
const db = await createSeedClient({ schema });

async function seed() {
  console.log('Seeding database...');

  // Create test users
  const [user1] = await db
    .insert(schema.authIdentity)
    .values({
      email: 'admin@example.com',
      password: 'hashed-password-here',
      emailVerified: new Date().toISOString(),
    })
    .returning();

  const [user2] = await db
    .insert(schema.authIdentity)
    .values({
      email: 'member@example.com',
      password: 'hashed-password-here',
      emailVerified: new Date().toISOString(),
    })
    .returning();

  console.log(`Created users: ${user1.email}, ${user2.email}`);

  // Create an organization
  const [org] = await db
    .insert(schema.organizations)
    .values({
      name: 'Acme Corp',
      slug: 'acme-corp',
      ownerId: user1.id,
      settings: '{}',
    })
    .returning();

  console.log(`Created org: ${org.name} (${org.slug})`);

  // Add members
  await db.insert(schema.orgMembers).values({
    orgId: org.id,
    userId: user1.id,
    role: 'owner',
  });

  await db.insert(schema.orgMembers).values({
    orgId: org.id,
    userId: user2.id,
    role: 'member',
  });

  console.log('Added org members');

  // Create user profiles
  await db.insert(schema.userProfile).values([
    {
      userId: user1.id,
      fullName: 'Alice Admin',
      timezone: 'America/New_York',
      isAdmin: true,
    },
    {
      userId: user2.id,
      fullName: 'Bob Member',
      timezone: 'America/Los_Angeles',
    },
  ]);

  console.log('Created user profiles');
  console.log('Seeding complete!');
  await db.$close();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
```

## Idempotent seeds

Seeds should be safe to run multiple times without creating duplicate data. Use conflict handling or check-before-insert patterns:

### Using onConflictDoNothing

```typescript
async function seedUsers() {
  const users = [
    { email: 'admin@example.com', password: 'hashed', emailVerified: new Date().toISOString() },
    { email: 'member@example.com', password: 'hashed', emailVerified: new Date().toISOString() },
  ];

  for (const user of users) {
    await db
      .insert(schema.authIdentity)
      .values(user)
      .onConflictDoNothing({ target: schema.authIdentity.email });
  }
}
```

### Using check-before-insert

```typescript
import { eq } from 'drizzle-orm';

async function seedOrganization(ownerId: string) {
  const [existing] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, 'acme-corp'))
    .limit(1);

  if (existing) {
    console.log('Organization already exists, skipping');
    return existing;
  }

  const [org] = await db
    .insert(schema.organizations)
    .values({
      name: 'Acme Corp',
      slug: 'acme-corp',
      ownerId,
      settings: '{}',
    })
    .returning();

  return org;
}
```

## Seed patterns

### Development data

Seed realistic data that covers common UI states and edge cases:

```typescript
async function seedDevelopmentData(orgId: string, userId: string) {
  // Create projects in various states
  const projectData = [
    { name: 'Website Redesign', description: 'Complete overhaul of the marketing site', isActive: true },
    { name: 'Mobile App v2', description: 'Native mobile app rewrite', isActive: true },
    { name: 'Legacy Migration', description: 'Migrate from old system', isActive: false },
  ];

  for (const data of projectData) {
    await db.insert(projects).values({
      orgId,
      createdById: userId,
      ...data,
    });
  }

  // Create notifications in various read/unread states
  const notificationData = [
    { title: 'Welcome to the team!', body: 'Get started by creating your first project.', isRead: true },
    { title: 'New member joined', body: 'Bob has joined Acme Corp.', isRead: false },
    { title: 'Project updated', body: 'Website Redesign was modified.', isRead: false },
  ];

  for (const data of notificationData) {
    await db.insert(schema.notifications).values({
      orgId,
      userId,
      type: 'GATE_ACTION_TAKEN',
      ...data,
    });
  }
}
```

### Test data for automated tests

The framework includes a test database utility at `tests/utils/test-db.ts` that provides fast, isolated test data:

```typescript
import { getTestDrizzleClient, seedTestDatabase, resetTestDatabase, closeTestDatabase } from 'tests/utils/test-db';

describe('ProjectService', () => {
  let db: TestDatabase;

  beforeAll(() => {
    db = getTestDrizzleClient();
  });

  beforeEach(async () => {
    await resetTestDatabase();
    await seedTestDatabase(); // Creates test users and org
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  it('creates a project', async () => {
    const { user1, org } = await seedTestDatabase();
    // ... test using seeded data
  });
});
```

### Modular seed functions

For larger applications, split seeds into modules and compose them:

```typescript
// apps/web/src/database/seeds/users.seed.ts
export async function seedUsers(db: CruzDatabase) {
  const [admin] = await db
    .insert(schema.authIdentity)
    .values({ email: 'admin@example.com', password: 'hashed', emailVerified: new Date().toISOString() })
    .onConflictDoNothing({ target: schema.authIdentity.email })
    .returning();

  // May return undefined if conflict occurred, so look it up
  if (!admin) {
    const [existing] = await db
      .select()
      .from(schema.authIdentity)
      .where(eq(schema.authIdentity.email, 'admin@example.com'))
      .limit(1);
    return { admin: existing };
  }

  return { admin };
}

// apps/web/src/database/seeds/orgs.seed.ts
export async function seedOrganizations(db: CruzDatabase, ownerId: string) {
  // ...
}

// apps/web/src/database/seed.ts
import { seedUsers } from './seeds/users.seed';
import { seedOrganizations } from './seeds/orgs.seed';

async function seed() {
  const { admin } = await seedUsers(db);
  await seedOrganizations(db, admin.id);
  console.log('Seeding complete!');
}
```

## Resetting and reseeding

To start completely fresh with seed data:

```bash
# Delete local database
cruz db hard-reset

# Recreate schema
cruz db migrate

# Insert seed data
cruz db seed
```

This is useful when your seed data has changed significantly or when the database schema has diverged from what your current seeds expect.

## Seed tips

1. **Use realistic data** — Names like "Test User 1" make it hard to spot UI bugs. Use realistic names, emails, and content.

2. **Cover edge cases** — Seed empty states (org with no projects), full states (many items), and boundary states (expired subscriptions, soft-deleted records).

3. **Keep seeds fast** — Seeds run frequently during development. Avoid inserting thousands of records unless you're specifically testing pagination or performance.

4. **Don't seed production** — Seeds are for development and testing. Production data should come from the application itself or a dedicated data migration script.

5. **Hash passwords properly** — If your seed creates users with passwords, use the same hashing algorithm your auth system uses. Hardcoded plaintext passwords in seeds won't work for login testing.

## Using Factories

CruzJS includes a `defineFactory()` helper that pairs with `@faker-js/faker` to generate realistic, randomized records. Factories work for both in-memory test objects and database-inserted rows.

### Defining a factory

```typescript
// apps/web/src/database/factories/user.factory.ts
import { defineFactory } from '@cruzjs/core/database/factories';
import { faker } from '@faker-js/faker';
import { createId } from '@paralleldrive/cuid2';

export const UserFactory = defineFactory(() => ({
  id: createId(),
  email: faker.internet.email(),
  password: faker.internet.password(),
  emailVerified: faker.date.past().toISOString(),
  createdAt: faker.date.past().toISOString(),
  updatedAt: new Date().toISOString(),
}));
```

Every call to `.build()` or `.create()` invokes the defaults function fresh, so each record gets unique faker values.

### Building plain objects (no database)

Use `build()` and `buildMany()` when you need test data without inserting anything:

```typescript
// Single object
const user = UserFactory.build();

// With overrides
const admin = UserFactory.build({ email: 'admin@example.com' });

// Multiple objects
const users = UserFactory.buildMany(5);

// Multiple with shared overrides
const verifiedUsers = UserFactory.buildMany(3, {
  emailVerified: new Date().toISOString(),
});
```

### Inserting into the database

Use `create()` and `createMany()` to insert records and get back the full rows (via `.returning()`):

```typescript
import * as schema from '../schema';

// Insert one record
const user = await UserFactory.create(db, schema.authIdentity);

// Insert with overrides
const admin = await UserFactory.create(db, schema.authIdentity, {
  email: 'admin@example.com',
});

// Insert many
const users = await UserFactory.createMany(db, schema.authIdentity, 10);
```

### Composing factories in seeds

Factories compose naturally with each other and with the seed patterns shown above:

```typescript
import { UserFactory } from './factories/user.factory';
import { OrgFactory } from './factories/org.factory';

async function seed() {
  const owner = await UserFactory.create(db, schema.authIdentity);

  const org = await OrgFactory.create(db, schema.organizations, {
    ownerId: owner.id,
  });

  // Create 5 members for the org
  const members = await UserFactory.createMany(db, schema.authIdentity, 5);
  for (const member of members) {
    await db.insert(schema.orgMembers).values({
      orgId: org.id,
      userId: member.id,
      role: 'member',
    });
  }
}
```
