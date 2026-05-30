# Test Utilities

This directory contains utilities and helpers for writing tests in the framework.

## TestBase Class

The `TestBase` class provides a base for test suites with Prisma client access and automatic cleanup.

### Usage

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBase } from '@/tests/utils/test-base';

describe('My Test Suite', () => {
  const testBase = new TestBase();

  beforeEach(async () => {
    await testBase.beforeEach();
  });

  afterEach(async () => {
    await testBase.afterEach();
  });

  it('should have Prisma access', () => {
    expect(testBase.prisma).toBeDefined();
  });
});
```

### Features

- **Prisma Client Access**: Automatically gets Prisma client from DI container
- **Automatic Cleanup**: Cleans up test data after each test in reverse dependency order
- **Consistent Setup**: Ensures all tests start with a clean database state

## Authentication Helpers

### `actingAs()`

Creates a test user with an active session for authentication testing.

```typescript
import { actingAs } from '@/tests/utils/auth-helpers';

const { user, session } = await actingAs(prisma, {
  email: 'test@example.com',
  name: 'Test User',
  emailVerified: true,
});

// Use user.id and session.token in your tests
```

### Options

- `email` - User email (default: auto-generated)
- `name` - User name (default: 'Test User')
- `password` - User password (default: 'TestPassword123!')
- `emailVerified` - Whether email is verified (default: false)

### Returns

- `user` - Created user object
- `session` - Created session object with token

## Database Helpers

### `resetDatabaseBeforeTest()`

Resets the database before each test, ensuring a clean state.

```typescript
import { beforeEach } from 'vitest';
import { resetDatabaseBeforeTest } from '@/tests/utils/database-helpers';

beforeEach(async () => {
  await resetDatabaseBeforeTest();
});
```

### `useDatabaseTransactions()`

Uses database transactions for test isolation (experimental).

```typescript
import { useDatabaseTransactions } from '@/tests/utils/database-helpers';

useDatabaseTransactions();
```

**Note**: Prisma doesn't support nested transactions directly. For better isolation, consider using separate test databases or database-level transaction isolation.

## Factory Functions

Factory functions help create test data quickly and consistently.

### `createTestUser()`

Creates a test user with sensible defaults.

```typescript
import { createTestUser } from '@/tests/utils/factories';

const user = await createTestUser({
  email: 'test@example.com',
  name: 'Test User',
  emailVerified: true,
});
```

### `createTestOrganization()`

Creates a test organization.

```typescript
import { createTestOrganization } from '@/tests/utils/factories';

const org = await createTestOrganization({
  name: 'Test Org',
  slug: 'test-org',
});
```

### `addUserToOrg()`

Adds a user to an organization with a specific role.

```typescript
import { addUserToOrg } from '@/tests/utils/factories';

const member = await addUserToOrg(userId, orgId, 'OWNER');
```

### `createTestInvitation()`

Creates a test invitation.

```typescript
import { createTestInvitation } from '@/tests/utils/factories';

const invitation = await createTestInvitation({
  email: 'invite@example.com',
  orgId: org.id,
  role: 'MEMBER',
});
```

## Best Practices

1. **Always Clean Up**: Use `TestBase` or `resetDatabaseBeforeTest()` to ensure tests don't affect each other
2. **Use Factories**: Use factory functions instead of manually creating test data
3. **Use `actingAs()`**: For authentication tests, use `actingAs()` to create users with sessions
4. **Isolate Tests**: Each test should be independent and not rely on data from other tests
5. **Use Descriptive Names**: Name test data clearly (e.g., `adminUser`, `memberUser`, `testOrg`)

## Example Test

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBase } from '@/tests/utils/test-base';
import { actingAs } from '@/tests/utils/auth-helpers';
import { createTestOrganization, addUserToOrg } from '@/tests/utils/factories';

describe('Organization Service', () => {
  const testBase = new TestBase();

  beforeEach(async () => {
    await testBase.beforeEach();
  });

  afterEach(async () => {
    await testBase.afterEach();
  });

  it('should allow owner to update organization', async () => {
    // Create authenticated user
    const { user } = await actingAs(testBase.prisma);

    // Create organization
    const org = await createTestOrganization();

    // Add user as owner
    await addUserToOrg(user.id, org.id, 'OWNER');

    // Test organization update
    // ... your test code here
  });
});
```

## See Also

- `tests/unit/utils/test-utilities.example.test.ts` - Complete examples of all utilities
- `tests/utils/test-db.ts` - Database connection and reset utilities
- `tests/utils/factories.ts` - Factory functions for test data

