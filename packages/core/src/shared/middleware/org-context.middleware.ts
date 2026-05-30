import type { CruzContainer } from '../../di';
import { ORG_SERVICE, PERMISSION_SERVICE, type IOrgService, type IPermissionService } from '../../orgs/interfaces';
import type { OrgContext } from '../../orgs/org.models';
import type { AuthenticatedRequest } from './session.middleware';

/**
 * Request context with organization information
 */
export type AuthenticatedOrgRequest = AuthenticatedRequest & {
  org: OrgContext;
};

/**
 * Extract organization ID from route params or header
 */
function extractOrgId(request: Request, params?: Record<string, string | undefined>): string | null {
  // Try route params first (e.g., /api/orgs/:orgId/...)
  if (params?.orgId) {
    return params.orgId;
  }

  // Try X-Organization-ID header
  const orgIdHeader = request.headers.get('x-organization-id');
  if (orgIdHeader) {
    return orgIdHeader;
  }

  return null;
}

/**
 * Resolve the user's default org when none is provided via route param / header.
 * Falls back to the user's first membership so single-org apps (and admin UIs
 * that just log in) get org context without sending an org id on every request.
 */
async function resolveDefaultOrgId(
  userId: string,
  container: CruzContainer
): Promise<string | null> {
  try {
    const orgService = container.get<IOrgService>(ORG_SERVICE);
    const orgs = await orgService.listUserOrgs(userId);
    return orgs[0]?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Organization context middleware
 * Extracts orgId from route params or header, loads user's role, and attaches to request context
 *
 * @param request - The HTTP request
 * @param params - Route params
 * @param auth - Authenticated session
 * @param container - The DI container for this request
 */
export const requireOrgContext = async (
  request: Request,
  params: Record<string, string | undefined> | undefined,
  auth: AuthenticatedRequest,
  container: CruzContainer
): Promise<AuthenticatedOrgRequest> => {
  const orgId =
    extractOrgId(request, params) ??
    (await resolveDefaultOrgId(auth.user.id, container));

  if (!orgId) {
    throw new Response(
      JSON.stringify({
        error: {
          code: 'BAD_REQUEST',
          message: 'Organization ID required (provide in route params or X-Organization-ID header)',
        },
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Check if organization exists and is not soft-deleted
  const orgService = container.get<IOrgService>(ORG_SERVICE);
  const org = await orgService.getOrg(orgId);

  if (!org) {
    throw new Response(
      JSON.stringify({
        error: {
          code: 'NOT_FOUND',
          message: 'Organization not found',
        },
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const permissionService = container.get<IPermissionService>(PERMISSION_SERVICE);
  const role = await permissionService.getUserRole(auth.user.id, orgId);

  if (!role) {
    throw new Response(
      JSON.stringify({
        error: {
          code: 'FORBIDDEN',
          message: 'User is not a member of this organization',
        },
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return {
    ...auth,
    org: {
      orgId,
      userId: auth.user.id,
      role,
    },
  };
};

/**
 * Optional organization context middleware - doesn't throw if orgId missing or user not member
 * Returns null if org context cannot be established
 *
 * @param request - The HTTP request
 * @param params - Route params
 * @param auth - Authenticated session
 * @param container - The DI container for this request
 */
export const getOrgContext = async (
  request: Request,
  params: Record<string, string | undefined> | undefined,
  auth: AuthenticatedRequest,
  container: CruzContainer
): Promise<AuthenticatedOrgRequest | null> => {
  try {
    return await requireOrgContext(request, params, auth, container);
  } catch {
    return null;
  }
};

