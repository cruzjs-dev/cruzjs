import type { SessionData } from './types';

/**
 * Get session token from Authorization header or auth_token cookie.
 */
export function getSessionToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    return authHeader.replace('Bearer ', '') || null;
  }
  // Fall back to cookie (set by storeSessionToken for SSR loader access)
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Get current session from API (server-side only)
 * For client-side, use trpc.auth.session.useQuery()
 */
export async function getSession(request: Request): Promise<SessionData | null> {
  const token = getSessionToken(request);
  if (!token) {
    return null;
  }

  try {
    const origin = new URL(request.url).origin;
    const response = await fetch(`${origin}/api/trpc/auth.session`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as { result?: { data?: { session?: SessionData } } };
    return data.result?.data?.session || null;
  } catch {
    return null;
  }
}

/**
 * Check if user is authenticated (for route protection - server-side only)
 */
export async function requireAuth(
  request: Request
): Promise<{ session: SessionData } | Response> {
  const session = await getSession(request);
  if (!session) {
    const url = new URL(request.url);
    // Use absolute URL based on request origin to avoid redirect issues
    const loginUrl = new URL('/auth/login', url.origin);
    loginUrl.searchParams.set('redirect', url.pathname);
    return Response.redirect(loginUrl.toString());
  }

  return { session };
}

