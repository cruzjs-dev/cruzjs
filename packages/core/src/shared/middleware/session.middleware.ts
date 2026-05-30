import { SessionService } from '../../auth/session.service';
import type { CruzContainer } from '../../di';
import type { SessionData } from '../../auth/auth.models';

/**
 * Request context with authenticated user
 */
export type AuthenticatedRequest = {
  user: {
    id: string;
  };
  session: SessionData;
};

/**
 * Extract session token from Authorization header or cookie
 */
const extractToken = (request: Request): string | null => {
  // Try Authorization header first (Bearer token)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try HttpOnly auth_token cookie (set by server on login/register)
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }

  return null;
};

/**
 * Session middleware for API routes
 * Extracts session token, validates it, and attaches user to request context
 *
 * @param request - The HTTP request
 * @param container - The DI container for this request
 */
export const requireSession = async (
  request: Request,
  container: CruzContainer
): Promise<AuthenticatedRequest> => {
  const token = extractToken(request);

  if (!token) {
    throw new Response(
      JSON.stringify({
        error: {
          code: 'UNAUTHORIZED',
          message: 'No session token provided',
        },
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const sessionService = container.resolve(SessionService);
  const session = await sessionService.getSession(token);

  if (!session) {
    throw new Response(
      JSON.stringify({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired session',
        },
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Refresh session if needed (sliding window)
  const refreshedSession = await sessionService.refreshSession(token);
  const finalSession = refreshedSession || session;

  return {
    user: {
      id: finalSession.userId,
    },
    session: finalSession,
  };
};

/**
 * Optional session middleware - doesn't throw if no session
 * Returns null if no valid session found
 *
 * @param request - The HTTP request
 * @param container - The DI container for this request
 */
export const getSession = async (
  request: Request,
  container: CruzContainer
): Promise<AuthenticatedRequest | null> => {
  try {
    return await requireSession(request, container);
  } catch {
    return null;
  }
};

