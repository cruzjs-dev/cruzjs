/**
 * @cruzjs/core Audit Logging
 *
 * Tracks who did what, when, and to which resource.
 * Supports org-scoped queries, entity history, actor history,
 * and pluggable storage adapters.
 */

// Types
export {
  AuditAction,
  AuditActorType,
  AUDIT_LOG_ADAPTER,
} from './audit.types';
export type {
  AuditLogEntry,
  CreateAuditLogInput,
  AuditLogQuery,
} from './audit.types';

// Adapter interface
export type { AuditLogAdapter } from './audit.adapter';

// Schema
export { auditLogs } from './audit.schema';
export type { AuditLog, NewAuditLog } from './audit.schema';

// Validation
export {
  auditLogQuerySchema,
  entityHistorySchema,
  actorHistorySchema,
  auditActionValues,
} from './audit.validation';
export type {
  AuditLogQueryInput,
  EntityHistoryInput,
  ActorHistoryInput,
} from './audit.validation';

// Service
export { AuditLogService } from './audit.service';

// Adapters
export { DatabaseAuditAdapter } from './adapters/database.audit.adapter';

// Middleware & Decorator
export { auditMiddleware } from './audit.middleware';
export { Auditable } from './audit.decorator';

// tRPC
export { AuditLogTrpc } from './audit.trpc';

// Module
export { AuditModule } from './audit.module';
