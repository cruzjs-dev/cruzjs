import * as schema from '@/database/schema';
import { buildContainerWithProviders } from '@cruzjs/core/framework/application.server';
import { DrizzleService } from '@cruzjs/core/shared/database/drizzle.service';

/**
 * Alternative: Use test database isolation
 * Each test gets a fresh database state
 * This is more reliable but slower than transactions
 */
export async function resetDatabaseBeforeTest(): Promise<void> {
  const container = await buildContainerWithProviders([]);
  const db = container.get<DrizzleService>(DrizzleService);

  // Delete in reverse order of dependencies
  await db.delete(schema.auditLogs);
  await db.delete(schema.invitations);
  await db.delete(schema.orgMembers);
  await db.delete(schema.subscriptions);
  await db.delete(schema.organizations);
  await db.delete(schema.jobs);
  await db.delete(schema.uploads);
  await db.delete(schema.refreshTokens);
  await db.delete(schema.sessions);
  await db.delete(schema.accounts);
  await db.delete(schema.users);
}
