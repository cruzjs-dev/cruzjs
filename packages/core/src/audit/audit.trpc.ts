/**
 * Audit Log tRPC Router (OOP)
 *
 * Org-scoped endpoints for querying audit logs.
 * Audit logs are read-only from the API — writes happen through the service.
 */

import { Router, Route, TrpcRouter } from '../trpc/router-class';
import { Inject } from '../di';
import { orgProcedure, protectedProcedure } from '../trpc/context';
import { AuditLogService } from './audit.service';
import {
  auditLogQuerySchema,
  entityHistorySchema,
  actorHistorySchema,
} from './audit.validation';

@Router()
export class AuditLogTrpc extends TrpcRouter {
  @Inject(AuditLogService) private service!: AuditLogService;

  /** List audit log entries for the current org with filtering and pagination */
  @Route() list = orgProcedure
    .input(auditLogQuerySchema)
    .query(async ({ ctx, input }) =>
      this.service.query({
        orgId: ctx.org.org.orgId,
        entityType: input.entityType,
        entityId: input.entityId,
        actorId: input.actorId,
        action: input.action,
        from: input.from ? new Date(input.from) : undefined,
        to: input.to ? new Date(input.to) : undefined,
        page: input.page,
        perPage: input.perPage,
      }),
    );

  /** Get the full action history for a specific entity within the org */
  @Route() getEntityHistory = orgProcedure
    .input(entityHistorySchema)
    .query(async ({ ctx, input }) =>
      this.service.getEntityHistory(input.entityType, input.entityId, ctx.org.org.orgId),
    );

  /** Get all actions performed by a specific actor */
  @Route() getActorHistory = protectedProcedure
    .input(actorHistorySchema)
    .query(async ({ ctx, input }) =>
      this.service.getActorHistory(input.actorId),
    );
}
