import * as schema from '@/database/schema';
import { getTestDrizzleClient, type TestDatabase } from './test-db';

/**
 * Base class for test suites
 * Provides Drizzle client and database cleanup
 */
export class TestBase {
  public db!: TestDatabase;

  /**
   * Setup before each test
   * Gets Drizzle client
   */
  async beforeEach(): Promise<void> {
    this.db = getTestDrizzleClient();
  }

  /**
   * Cleanup after each test
   * Deletes all test data in reverse dependency order
   */
  async afterEach(): Promise<void> {
    if (!this.db) {
      return;
    }

    // Clean up test data in reverse order of dependencies
    await this.db.delete(schema.auditLogs);
    await this.db.delete(schema.invitations);
    await this.db.delete(schema.orgMembers);
    await this.db.delete(schema.subscriptions);
    await this.db.delete(schema.organizations);
    await this.db.delete(schema.jobs);
    await this.db.delete(schema.uploads);
    await this.db.delete(schema.refreshTokens);
    await this.db.delete(schema.sessions);
    await this.db.delete(schema.accounts);
    await this.db.delete(schema.users);
  }
}
