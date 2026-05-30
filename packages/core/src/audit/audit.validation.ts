/**
 * Audit Log Validation Schemas
 *
 * Zod schemas for tRPC input validation.
 */

import { z } from 'zod';

export const auditActionValues = [
  'create', 'update', 'delete', 'restore',
  'login', 'logout', 'export', 'import',
  'permission_change', 'revoke', 'invite', 'accept_invite',
] as const;

export const auditLogQuerySchema = z.object({
  entityType: z.string().max(100).optional(),
  entityId: z.string().max(100).optional(),
  actorId: z.string().max(100).optional(),
  action: z.enum(auditActionValues).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(50),
});

export const entityHistorySchema = z.object({
  entityType: z.string().min(1).max(100),
  entityId: z.string().min(1).max(100),
});

export const actorHistorySchema = z.object({
  actorId: z.string().min(1).max(100),
});

export type AuditLogQueryInput = z.infer<typeof auditLogQuerySchema>;
export type EntityHistoryInput = z.infer<typeof entityHistorySchema>;
export type ActorHistoryInput = z.infer<typeof actorHistorySchema>;
