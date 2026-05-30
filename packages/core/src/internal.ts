/**
 * @cruzjs/core/internal
 *
 * Internal exports for sibling packages (@cruzjs/start, @cruzjs/saas).
 * These are NOT part of the public API and may change without notice.
 *
 * App developers should use the public sub-path exports instead:
 *   @cruzjs/core, @cruzjs/core/di, @cruzjs/core/trpc/context, etc.
 */

// ── Auth internals ──────────────────────────────────────────────────────────
export { SessionService } from './auth/session.service';
export { AuthService } from './auth/auth.service';

// ── Framework internals ─────────────────────────────────────────────────────
export {
  buildContainerWithModules,
  buildContainerWithProviders,
  getOrBuildContainer,
  resetContainerCache,
} from './framework/application.server';

// ── Database internals ──────────────────────────────────────────────────────
export {
  DRIZZLE,
  DrizzleService,
  DrizzleCruzDatabase,
} from './shared/database/drizzle.service';
export type {
  CruzDatabase,
  AnyDialectDatabase,
} from './shared/database/drizzle.service';

// ── Events internals ────────────────────────────────────────────────────────
export { EventEmitterService } from './shared/events/event-emitter.service.server';
export { AppEvent } from './shared/events/event';

// ── Middleware internals ────────────────────────────────────────────────────
export { requirePermission } from './shared/middleware/permission.middleware';
export { auditMiddleware } from './shared/middleware/audit.middleware';

// ── Jobs internals ──────────────────────────────────────────────────────────
export { JobService } from './jobs/job.service';
export type { JobHandler, JobHandlerMetadata, JobResult } from './jobs/job.types';

// ── Email internals ─────────────────────────────────────────────────────────
export { EmailService, EMAIL_SERVICE } from './email/email.service';

// ── Org internals ───────────────────────────────────────────────────────────
export type {
  MemberResponse,
  InvitationResponse,
  InvitationWithOrgResponse,
} from './orgs/org.models';
export {
  ORG_ACTIONS,
  MEMBER_ACTIONS,
  INVITATION_ACTIONS,
  SUBSCRIPTION_ACTIONS,
  RESOURCES,
} from './orgs/audit-actions';
