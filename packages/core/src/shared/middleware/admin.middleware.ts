import { requireSession } from './session.middleware';
import type { CruzContainer } from '../../di';
import { IUserHydrator, USER_HYDRATOR } from '../../auth/interfaces/user-hydrator.interface';
import { DRIZZLE, type DrizzleDatabase } from '../database/drizzle.service';
import { authIdentity } from '../../database/schema';
import { eq } from 'drizzle-orm';

/**
 * Admin authorization middleware
 * Requires user to be authenticated and have admin role
 *
 * @param request - The HTTP request
 * @param container - The DI container for this request
 */
export async function requireAdmin(request: Request, container: CruzContainer): Promise<void> {
  const { user } = await requireSession(request, container);

  // Get user email from identity
  const db = container.get<DrizzleDatabase>(DRIZZLE);
  const [identity] = await db
    .select({ email: authIdentity.email })
    .from(authIdentity)
    .where(eq(authIdentity.id, user.id))
    .limit(1);

  if (!identity) {
    throw new Response(
      JSON.stringify({
        error: {
          code: 'FORBIDDEN',
          message: 'User not found',
        },
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Get hydrated profile data via app-provided hydrator
  const hydrator = container.get<IUserHydrator>(USER_HYDRATOR);
  const hydratedData = await hydrator.hydrate(user.id, identity.email);

  if (!hydratedData.profile?.isAdmin) {
    throw new Response(
      JSON.stringify({
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required',
        },
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

