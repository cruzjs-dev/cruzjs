import { PERMISSION_SERVICE, type IPermissionService } from '../../orgs/interfaces';
import type { Permission } from '../../orgs/org.models';
import type { AuthenticatedOrgRequest } from './org-context.middleware';
import type { CruzContainer } from '../../di';

/**
 * Require a single permission.
 *
 * The container should be the request-scoped DI container (e.g. from tRPC ctx.container).
 * If no container is provided, it falls back to the global cached container.
 */
export const requirePermission = async (
  context: AuthenticatedOrgRequest,
  permission: Permission,
  container?: CruzContainer
): Promise<void> => {
  const resolvedContainer = container ?? await getGlobalContainer();
  const permissionService = resolvedContainer.get<IPermissionService>(PERMISSION_SERVICE);
  const hasAccess = await permissionService.hasPermission(
    context.user.id,
    context.org.orgId,
    permission
  );

  if (!hasAccess) {
    throw new Response(
      JSON.stringify({
        error: {
          code: 'FORBIDDEN',
          message: `Permission denied: ${permission}`,
        },
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

/**
 * Require any of the specified permissions (OR logic)
 */
export const requireAnyPermission = async (
  context: AuthenticatedOrgRequest,
  permissions: Permission[],
  container?: CruzContainer
): Promise<void> => {
  const resolvedContainer = container ?? await getGlobalContainer();
  const permissionService = resolvedContainer.get<IPermissionService>(PERMISSION_SERVICE);
  for (const permission of permissions) {
    const hasAccess = await permissionService.hasPermission(
      context.user.id,
      context.org.orgId,
      permission
    );

    if (hasAccess) {
      return;
    }
  }

  throw new Response(
    JSON.stringify({
      error: {
        code: 'FORBIDDEN',
        message: `Permission denied: requires one of [${permissions.join(', ')}]`,
      },
    }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};

/**
 * Require all of the specified permissions (AND logic)
 */
export const requireAllPermissions = async (
  context: AuthenticatedOrgRequest,
  permissions: Permission[],
  container?: CruzContainer
): Promise<void> => {
  const resolvedContainer = container ?? await getGlobalContainer();
  const permissionService = resolvedContainer.get<IPermissionService>(PERMISSION_SERVICE);
  for (const permission of permissions) {
    const hasAccess = await permissionService.hasPermission(
      context.user.id,
      context.org.orgId,
      permission
    );

    if (!hasAccess) {
      throw new Response(
        JSON.stringify({
          error: {
            code: 'FORBIDDEN',
            message: `Permission denied: requires ${permission}`,
          },
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }
};

async function getGlobalContainer(): Promise<CruzContainer> {
  const { getOrBuildContainer } = await import('../../framework/application.server');
  const { getRegisteredModules } = await import('../../framework/module-registry');
  const { container } = await getOrBuildContainer(getRegisteredModules());
  return container;
}
