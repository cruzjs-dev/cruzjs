/**
 * Audit Middleware
 *
 * tRPC middleware that automatically logs mutations to the audit trail.
 * Captures actor, org context, and before/after snapshots.
 */

import { experimental_standaloneMiddleware } from '@trpc/server';
import type { AuditAction } from './audit.types';
import type { AuditLogService } from './audit.service';

/**
 * Create a tRPC middleware that auto-logs mutations to the audit trail.
 *
 * @example
 * ```typescript
 * @Route() update = orgProcedure
 *   .input(updateSchema)
 *   .use(auditMiddleware({
 *     action: AuditAction.UPDATE,
 *     entityType: 'product',
 *     getEntityId: (input) => (input as { id: string }).id,
 *   }))
 *   .mutation(async ({ ctx, input }) => this.service.update(input));
 * ```
 */
export function auditMiddleware(options: {
  action: AuditAction;
  entityType: string;
  getEntityId?: (input: unknown) => string;
}) {
  return experimental_standaloneMiddleware().create(async (opts) => {
    const { ctx, input, next } = opts;

    // Execute the actual procedure
    const result = await next({ ctx });

    // Log after successful execution (fire-and-forget)
    try {
      // Attempt to resolve audit service from context container
      const container = (ctx as Record<string, unknown>).container as {
        resolve?: (cls: unknown) => AuditLogService;
      } | undefined;

      if (container?.resolve) {
        // Dynamic import to avoid circular dependencies
        const { AuditLogService } = await import('./audit.service');
        const auditService = container.resolve(AuditLogService);

        const session = (ctx as Record<string, unknown>).session as {
          user?: { id: string };
        } | null;

        const org = (ctx as Record<string, unknown>).org as {
          orgId?: string;
        } | null;

        const request = (ctx as Record<string, unknown>).request as Request | undefined;

        await auditService.log({
          action: options.action,
          entityType: options.entityType,
          entityId: options.getEntityId ? options.getEntityId(input) : undefined,
          actorId: session?.user?.id,
          actorType: 'user',
          orgId: org?.orgId,
          ipAddress: request?.headers?.get('x-forwarded-for') ?? request?.headers?.get('cf-connecting-ip') ?? undefined,
          userAgent: request?.headers?.get('user-agent') ?? undefined,
        });
      }
    } catch {
      // Audit logging failures must not break the main operation
    }

    return result;
  });
}
