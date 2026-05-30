import { buildContainerWithProviders } from '../../framework/application.server';
import type { AuditAction, AuditResource } from '../../orgs/org.models';
import type { AuthenticatedOrgRequest } from './org-context.middleware';

/**
 * Audit logging middleware and utilities
 * 
 * This module provides utilities for logging audit events.
 * For explicit logging, use logAuditEvent() helper function.
 * For automatic logging, use the auditMiddleware() function.
 */

/**
 * Extract IP address from request
 */
function getIpAddress(request: Request): string | null {
  // Check X-Forwarded-For header (for proxies/load balancers)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  // Check X-Real-IP header
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return null;
}

/**
 * Extract user agent from request
 */
function getUserAgent(request: Request): string | null {
  return request.headers.get('user-agent');
}

/**
 * Log an audit event explicitly
 * This is the recommended way to log audit events from services
 * 
 * @example
 * ```typescript
 * await logAuditEvent(
 *   orgContext,
 *   ORG_ACTIONS.CREATED,
 *   RESOURCES.ORGANIZATION,
 *   { name: org.name, slug: org.slug },
 *   request
 * );
 * ```
 */
export async function logAuditEvent(
  orgContext: { orgId: string; userId: string | null },
  action: AuditAction,
  resource: AuditResource,
  metadata?: Record<string, unknown>,
  request?: Request
): Promise<void> {
  try {
    const container = await buildContainerWithProviders([]);
    // AuditLogService is provided by @cruzjs/saas — resolve dynamically
    // If pro is not installed, this is a no-op
    const auditLogService = container.get<any>('AuditLogService');
    if (auditLogService?.logAudit) {
      await auditLogService.logAudit(
        orgContext.orgId,
        orgContext.userId,
        action,
        resource,
        metadata,
        request ? getIpAddress(request) : null,
        request ? getUserAgent(request) : null
      );
    }
  } catch {
    // AuditLogService not available (pro not installed) — skip audit logging
  }
}

/**
 * Audit middleware configuration
 * Maps HTTP methods and routes to audit actions
 */
type AuditRouteConfig = {
  method: string;
  pathPattern: RegExp;
  action: AuditAction;
  resource: AuditResource;
  extractMetadata?: (request: Request, params?: Record<string, string | undefined>) => Record<string, unknown>;
};

/**
 * Default audit route configurations
 * These can be extended or overridden per route
 */
const defaultAuditConfigs: AuditRouteConfig[] = [
  {
    method: 'POST',
    pathPattern: /^\/api\/orgs\/[^/]+$/,
    action: 'created',
    resource: 'organization',
  },
  {
    method: 'PATCH',
    pathPattern: /^\/api\/orgs\/[^/]+$/,
    action: 'updated',
    resource: 'organization',
  },
  {
    method: 'DELETE',
    pathPattern: /^\/api\/orgs\/[^/]+$/,
    action: 'deleted',
    resource: 'organization',
  },
  {
    method: 'POST',
    pathPattern: /^\/api\/orgs\/[^/]+\/members$/,
    action: 'added',
    resource: 'member',
  },
  {
    method: 'DELETE',
    pathPattern: /^\/api\/orgs\/[^/]+\/members\/[^/]+$/,
    action: 'removed',
    resource: 'member',
  },
  {
    method: 'PATCH',
    pathPattern: /^\/api\/orgs\/[^/]+\/members\/[^/]+$/,
    action: 'role_changed',
    resource: 'member',
  },
  {
    method: 'POST',
    pathPattern: /^\/api\/orgs\/[^/]+\/invitations$/,
    action: 'invited',
    resource: 'invitation',
  },
  {
    method: 'POST',
    pathPattern: /^\/api\/invitations\/[^/]+\/accept$/,
    action: 'accepted',
    resource: 'invitation',
  },
  {
    method: 'POST',
    pathPattern: /^\/api\/invitations\/[^/]+\/decline$/,
    action: 'declined',
    resource: 'invitation',
  },
];

/**
 * Find matching audit config for a request
 */
function findAuditConfig(
  method: string,
  pathname: string,
  configs: AuditRouteConfig[] = defaultAuditConfigs
): AuditRouteConfig | null {
  return (
    configs.find((config) => config.method === method && config.pathPattern.test(pathname)) || null
  );
}

/**
 * Audit middleware factory
 * Creates middleware that automatically logs audit events based on route configuration
 * 
 * Note: This is optional - explicit logging via logAuditEvent() is recommended for better control
 * 
 * @example
 * ```typescript
 * export async function action({ request, params }: ActionFunctionArgs) {
 *   const auth = await requireSession(request);
 *   const orgContext = await requireOrgContext(request, params, auth);
 *   
 *   // Your action logic here
 *   
 *   // Auto-log if configured
 *   await auditMiddleware(request, orgContext, params);
 * }
 * ```
 */
export async function auditMiddleware(
  request: Request,
  orgContext: AuthenticatedOrgRequest,
  params?: Record<string, string | undefined>,
  customConfigs?: AuditRouteConfig[]
): Promise<void> {
  const method = request.method;
  const url = new URL(request.url);
  const pathname = url.pathname;

  const config = findAuditConfig(method, pathname, customConfigs);
  if (!config) {
    return; // No audit config for this route
  }

  let metadata: Record<string, unknown> | undefined;
  if (config.extractMetadata) {
    metadata = config.extractMetadata(request, params);
  }

  await logAuditEvent(
    { orgId: orgContext.org.orgId, userId: orgContext.user.id },
    config.action,
    config.resource,
    metadata,
    request
  );
}

