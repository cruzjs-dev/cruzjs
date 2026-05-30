import { CSRFService } from '../security/csrf.service';
import { requireSession } from './session.middleware';
import type { CruzContainer } from '../../di';

/**
 * CSRF protection middleware
 * Validates CSRF token for state-changing requests
 *
 * @param request - The HTTP request
 * @param container - The DI container for this request
 */
export async function requireCSRF(request: Request, container: CruzContainer): Promise<void> {
  // Skip CSRF for GET requests
  if (request.method === 'GET' || request.method === 'HEAD') {
    return;
  }

  // Get session (CSRF protection requires session)
  await requireSession(request, container);

  // Create CSRF service instance
  const csrfService = new CSRFService();

  // Get CSRF token from header or body
  const csrfToken = csrfService.getTokenFromHeader(request) || 
                     csrfService.getTokenFromBody(await request.json().catch(() => ({})));

  if (!csrfToken) {
    throw new Error('CSRF token missing');
  }

  // Verify token (in production, compare with session-stored token)
  // For now, simple validation
  if (csrfToken.length < 32) {
    throw new Error('Invalid CSRF token');
  }
}

