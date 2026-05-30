import type { AuditAction, AuditResource } from './org.models';

/**
 * Standard audit action definitions
 * These are the canonical action types used throughout the application
 */

/**
 * Organization actions
 */
export const ORG_ACTIONS = {
  CREATED: 'created' as AuditAction,
  UPDATED: 'updated' as AuditAction,
  DELETED: 'deleted' as AuditAction,
} as const;

/**
 * Member actions
 */
export const MEMBER_ACTIONS = {
  ADDED: 'added' as AuditAction,
  REMOVED: 'removed' as AuditAction,
  ROLE_CHANGED: 'role_changed' as AuditAction,
} as const;

/**
 * Invitation actions
 */
export const INVITATION_ACTIONS = {
  INVITED: 'invited' as AuditAction,
  ACCEPTED: 'accepted' as AuditAction,
  DECLINED: 'declined' as AuditAction,
  CANCELED: 'canceled' as AuditAction,
} as const;

/**
 * Subscription actions
 */
export const SUBSCRIPTION_ACTIONS = {
  SUBSCRIBED: 'subscribed' as AuditAction,
  UNSUBSCRIBED: 'unsubscribed' as AuditAction,
  PAYMENT_SUCCEEDED: 'payment_succeeded' as AuditAction,
  PAYMENT_FAILED: 'payment_failed' as AuditAction,
} as const;

/**
 * Resource type constants
 */
export const RESOURCES = {
  ORGANIZATION: 'organization' as AuditResource,
  MEMBER: 'member' as AuditResource,
  INVITATION: 'invitation' as AuditResource,
  SUBSCRIPTION: 'subscription' as AuditResource,
  BILLING: 'billing' as AuditResource,
  USER: 'user' as AuditResource,
} as const;

