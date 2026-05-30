import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as schema from '@/database/schema';
import { TestBase } from '../../../tests/utils/test-base';
import { actingAs } from '../../../tests/utils/auth-helpers';
import { resetDatabaseBeforeTest } from '../../../tests/utils/database-helpers';
import {
  createTestUser,
  createTestOrganization,
  addUserToOrg,
} from '../../../tests/utils/factories';

/**
 * Example test demonstrating TestBase usage
 */
describe('TestBase Example', () => {
  const testBase = new TestBase();

  beforeEach(async () => {
    await testBase.beforeEach();
  });

  afterEach(async () => {
    await testBase.afterEach();
  });

  it('should have access to Drizzle client', () => {
    expect(testBase.db).toBeDefined();
  });

  it('should clean up test data after each test', async () => {
    // Create test data
    const [user] = await testBase.db
      .insert(schema.users)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed-password',
      })
      .returning();

    expect(user).toBeDefined();

    // Data will be cleaned up by afterEach
  });
});

/**
 * Example test demonstrating actingAs() helper
 */
describe('actingAs() Helper Example', () => {
  const testBase = new TestBase();

  beforeEach(async () => {
    await testBase.beforeEach();
  });

  afterEach(async () => {
    await testBase.afterEach();
  });

  it('should create user with session', async () => {
    const { user, session } = await actingAs(testBase.db, {
      email: 'test@example.com',
      name: 'Test User',
    });

    expect(user).toBeDefined();
    expect(user.email).toBe('test@example.com');
    expect(session).toBeDefined();
    expect(session.token).toBeDefined();
  });

  it('should create user with custom options', async () => {
    const { user } = await actingAs(testBase.db, {
      email: 'verified@example.com',
      name: 'Verified User',
      emailVerified: true,
    });

    expect(user.emailVerified).not.toBeNull();
  });
});

/**
 * Example test demonstrating database reset helper
 * TODO: This test needs refactoring for the new DI structure
 */
describe.skip('Database Reset Helper Example', () => {
  beforeEach(async () => {
    await resetDatabaseBeforeTest();
  });

  it('should start with clean database', async () => {
    // This test is skipped pending DI refactoring
  });
});

/**
 * Example test demonstrating factory functions
 */
describe('Factory Functions Example', () => {
  const testBase = new TestBase();

  beforeEach(async () => {
    await testBase.beforeEach();
  });

  afterEach(async () => {
    await testBase.afterEach();
  });

  it('should create test user with factory', async () => {
    const user = await createTestUser({
      email: 'factory@example.com',
      name: 'Factory User',
    });

    expect(user.email).toBe('factory@example.com');
    expect(user.name).toBe('Factory User');
  });

  it('should create test organization with factory', async () => {
    const org = await createTestOrganization({
      name: 'Test Org',
      slug: 'test-org',
    });

    expect(org.name).toBe('Test Org');
    expect(org.slug).toBe('test-org');
  });

  it('should add user to organization', async () => {
    const user = await createTestUser();
    const org = await createTestOrganization();

    const member = await addUserToOrg(user.id, org.id, 'OWNER');

    expect(member.userId).toBe(user.id);
    expect(member.orgId).toBe(org.id);
    expect(member.role).toBe('OWNER');
  });
});
