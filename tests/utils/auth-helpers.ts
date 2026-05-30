import * as schema from '@/database/schema';
import { SessionService } from '@cruzjs/core/auth/session.service';
import { buildContainerWithProviders } from '@cruzjs/core/framework/application.server';
import bcrypt from 'bcryptjs';
import type { TestDatabase } from './test-db';

type ActingAsOptions = {
  email?: string;
  name?: string;
  password?: string;
  emailVerified?: boolean;
};

/**
 * Create a test user with session for authentication testing
 * @param db - Drizzle database client instance
 * @param options - User creation options
 * @returns User and session objects
 */
export async function actingAs(
  db: TestDatabase,
  options: ActingAsOptions = {}
): Promise<{ user: schema.User; session: { token: string; expiresAt: Date } }> {
  const container = await buildContainerWithProviders([]);
  const sessionService = container.get<SessionService>(SessionService);

  const email = options.email || `test-${Date.now()}@example.com`;
  const name = options.name || 'Test User';
  const password = options.password || 'TestPassword123!';
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const [user] = await db
    .insert(schema.users)
    .values({
      email,
      name,
      password: hashedPassword,
      emailVerified: options.emailVerified ? new Date() : null,
    })
    .returning();

  // Create session
  const sessionInfo = await sessionService.createSession({
    userId: user.id,
    userAgent: 'test',
    ipAddress: '127.0.0.1',
  });

  return {
    user,
    session: {
      token: sessionInfo.token,
      expiresAt: sessionInfo.expiresAt,
    },
  };
}
