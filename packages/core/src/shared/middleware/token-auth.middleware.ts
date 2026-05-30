import { TokenService } from '../../auth/token.service';
import { buildContainerWithProviders } from '../../framework/application.server';
import type { TokenPayload } from '../../auth/auth.models';

/**
 * Request context with authenticated user via JWT
 */
export type AuthenticatedTokenRequest = {
  user: {
    id: string;
  };
  token: TokenPayload;
};

/**
 * Extract JWT token from Authorization header
 */
const extractToken = (request: Request): string | null => {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
};

/**
 * Token authentication middleware for API routes
 * Extracts JWT token, validates it, and attaches user to request context
 * 
 * Usage in React Router 7 loader/action:
 * ```typescript
 * export async function loader({ request }: LoaderFunctionArgs) {
 *   const auth = await requireTokenAuth(request);
 *   // auth.user.id is available
 *   // auth.token contains token payload
 * }
 * ```
 */
export const requireTokenAuth = async (
  request: Request
): Promise<AuthenticatedTokenRequest> => {
  const token = extractToken(request);
  
  if (!token) {
    throw new Response(
      JSON.stringify({
        error: {
          code: 'UNAUTHORIZED',
          message: 'No access token provided',
        },
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const container = await buildContainerWithProviders([]);
  const tokenService = container.get<TokenService>(TokenService);
  const payload = tokenService.verifyAccessToken(token);
  
  if (!payload) {
    throw new Response(
      JSON.stringify({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired access token',
        },
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return {
    user: {
      id: payload.userId,
    },
    token: payload,
  };
};

/**
 * Optional token authentication middleware - doesn't throw if no token
 * Returns null if no valid token found
 */
export const getTokenAuth = async (
  request: Request
): Promise<AuthenticatedTokenRequest | null> => {
  try {
    return await requireTokenAuth(request);
  } catch {
    return null;
  }
};

