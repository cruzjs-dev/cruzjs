/**
 * @cruzjs/saas - Server-only exports
 *
 * Org services have moved to @cruzjs/start. Re-exported here for backwards compatibility.
 * Import from '@cruzjs/start/orgs/*' for new code.
 */

// Re-export client-safe schemas
export * from './index';

// Re-export org services from start for backwards compatibility
export { OrgService } from '@cruzjs/start/orgs/org.service';
export { MemberService } from '@cruzjs/start/orgs/member.service';
export { InvitationService } from '@cruzjs/start/orgs/invitation.service';
export { PermissionService } from '@cruzjs/start/orgs/permission.service';

// Pro-only services
export { AuditLogService } from './orgs/audit-log.service';

// Billing services
export { BillingService } from './billing/billing.service';
export { BillingModule } from './billing/billing.module';
export { BillingTrpc } from './billing/billing.trpc';
export { BillingWebhookApiRouter } from './billing/billing.webhook.api-router';
export { StripeBillingAdapter } from './billing/adapters/stripe.adapter';
export { BILLING_ADAPTER } from './billing/billing.types';
export type { BillingAdapter } from './billing/billing.adapter';
export type { Plan, Subscription, Invoice, UsageRecord } from './billing/billing.types';
export { SubscriptionStatus, PlanInterval, PlanType } from './billing/billing.types';

// Legacy billing exports (backward compatibility)
export { CheckoutService } from './billing/checkout.service';
export { WebhookService } from './billing/webhook.service';

// Stripe
export { StripeService } from './stripe/stripe.service';
