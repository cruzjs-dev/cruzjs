/**
 * Maintenance Middleware
 *
 * Checks maintenance state before every request.
 * Returns a 503 response with Retry-After header when active.
 * Supports path exclusions and secret-based bypass.
 */
import type { MaintenanceService } from './maintenance.service';
import { MAINTENANCE_BYPASS_COOKIE } from './maintenance.types';

/** Paths excluded from maintenance checks by default */
const DEFAULT_EXCLUDED_PATHS = [
  '/api/health',
  '/api/trpc/maintenance.status',
  '/api/trpc/maintenance.enable',
  '/api/trpc/maintenance.disable',
];

/**
 * Maintenance mode middleware.
 *
 * Returns `null` if the request should proceed normally.
 * Returns a `Response(503)` if maintenance mode is active and the request
 * is not bypassed.
 *
 * When a request contains a valid bypass secret in the `?bypass` query
 * parameter, a `Set-Cookie` header is added so subsequent requests
 * are automatically bypassed via cookie.
 */
export async function withMaintenanceCheck(
  request: Request,
  service: MaintenanceService,
  excludePaths?: string[],
): Promise<Response | null> {
  // Fast path — check if maintenance is active
  const active = await service.isActive();
  if (!active) {
    return null;
  }

  // Check excluded paths
  const url = new URL(request.url);
  const allExcluded = [...DEFAULT_EXCLUDED_PATHS, ...(excludePaths ?? [])];
  for (const excluded of allExcluded) {
    if (excluded.endsWith('*')) {
      // Wildcard prefix match
      if (url.pathname.startsWith(excluded.slice(0, -1))) {
        return null;
      }
    } else if (url.pathname === excluded) {
      return null;
    }
  }

  // Check bypass
  const bypassed = await service.isBypassed(request);
  if (bypassed) {
    // If bypass came from a query param, set a cookie for future requests
    const bypassParam = url.searchParams.get('bypass');
    if (bypassParam) {
      const state = await service.getState();
      if (bypassParam === state.secret) {
        // Return null (proceed) but instruct caller to add cookie header.
        // Since we can't modify the outgoing response from here, we return
        // a special "bypass" response with a cookie-setting header that the
        // caller can merge, OR we simply return null and handle cookie
        // setting at the framework level.
        //
        // For simplicity, we return null here. The cookie is set by the
        // framework integration in create-cruz-app.
        return null;
      }
    }
    return null;
  }

  // Build 503 response
  const state = await service.getState();
  const body = JSON.stringify({
    error: 'Service Unavailable',
    message: state.message,
    retryAfter: state.retryAfter,
  });

  return new Response(body, {
    status: 503,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(state.retryAfter),
    },
  });
}

/**
 * Build a Set-Cookie header value for the maintenance bypass cookie.
 * Used by the framework integration when a bypass query param is detected.
 */
export function buildBypassCookieHeader(secret: string): string {
  return `${MAINTENANCE_BYPASS_COOKIE}=${encodeURIComponent(secret)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`;
}
