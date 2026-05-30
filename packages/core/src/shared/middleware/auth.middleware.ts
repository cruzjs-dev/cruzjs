/**
 * Authentication middleware barrel file
 * Re-exports session and org context middleware for convenience
 */
export { requireSession } from './session.middleware';
export type { AuthenticatedRequest } from './session.middleware';
export { requireOrgContext, getOrgContext } from './org-context.middleware';
export type { AuthenticatedOrgRequest } from './org-context.middleware';

