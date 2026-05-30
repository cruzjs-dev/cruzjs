/**
 * Client-side authentication utilities
 *
 * Session tokens live in HttpOnly cookies set by the server on login/register.
 * JavaScript cannot read them (XSS protection). The browser sends the cookie
 * automatically on same-origin requests via `credentials: 'same-origin'` (default).
 *
 * Note: Do NOT import server-only modules here!
 */

/**
 * @deprecated Tokens are now set by the server as HttpOnly cookies. This is a no-op.
 * Kept for backwards compatibility with calling sites that haven't been updated.
 */
export function storeSessionToken(_token: string): void {
  // Server-side login/register mutations set HttpOnly cookies via Set-Cookie.
  // JavaScript cannot (and should not) write the auth cookie directly.
}

/**
 * @deprecated Auth tokens are HttpOnly cookies — JavaScript cannot read them.
 * Use `trpc.auth.session.useQuery()` to check authentication state.
 * Always returns null.
 */
export function getStoredSessionToken(): string | null {
  return null;
}

/**
 * Clear client-side auth state. The server-side cookie is cleared by calling
 * `trpc.auth.logout.useMutation()` or POSTing to `/api/trpc/auth.logout`.
 *
 * Kept for callers that want to clear any legacy client-side state (e.g. an
 * old `auth_token` value left in localStorage from a previous version).
 */
export function clearSessionToken(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('auth_token');
  } catch {
    // localStorage unavailable
  }
}

/**
 * Check if user is authenticated. Uses the HttpOnly auth cookie automatically.
 * Note: Prefer `trpc.auth.session.useQuery()` for better type safety + caching.
 */
export async function checkAuthClient(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const response = await fetch('/api/trpc/auth.session', {
      credentials: 'same-origin',
    });
    if (!response.ok) return false;
    const data = await response.json() as { result?: { data?: unknown } };
    // session query returns null when no token / invalid session
    return data.result?.data != null;
  } catch {
    return false;
  }
}

/**
 * Get current user info (client-side only). Uses the HttpOnly auth cookie.
 * Note: Prefer `trpc.auth.session.useQuery()` for better type safety.
 */
export async function getCurrentUser(): Promise<{
  id: string;
  email: string;
  name: string | null;
  emailVerified: string | null;
} | null> {
  if (typeof window === 'undefined') return null;
  try {
    const response = await fetch('/api/trpc/auth.session', {
      credentials: 'same-origin',
    });
    if (!response.ok) return null;
    const data = await response.json() as { result?: { data?: { user?: { id: string; email: string; name: string | null; emailVerified: string | null } } } };
    return data.result?.data?.user || null;
  } catch {
    return null;
  }
}

/**
 * Logout current user. Calls the server logout endpoint which deletes the
 * session and clears the HttpOnly auth cookie via Set-Cookie.
 * Note: Prefer `trpc.auth.logout.useMutation()` for better type safety.
 */
export async function logout(): Promise<void> {
  try {
    await fetch('/api/trpc/auth.logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
  } catch {
    // Ignore errors, still clear any client-side state
  }
  clearSessionToken();
}
