/**
 * Auditable Decorator
 *
 * Method decorator for service methods that auto-logs actions to the audit trail.
 * Requires the class to have an `auditService` property injected.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class ProductService {
 *   @Inject(AuditLogService) private auditService!: AuditLogService;
 *
 *   @Auditable({ action: AuditAction.CREATE, entityType: 'product' })
 *   async create(orgId: string, userId: string, input: CreateInput): Promise<Product> {
 *     // ...
 *   }
 * }
 * ```
 */

import type { AuditAction } from './audit.types';

export function Auditable(options: {
  action: AuditAction;
  entityType: string;
}): MethodDecorator {
  return function (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: Record<string, unknown>, ...args: unknown[]) {
      const result = await originalMethod.apply(this, args);

      // Fire-and-forget audit log
      try {
        const auditService = this.auditService as {
          log: (input: Record<string, unknown>) => Promise<void>;
        } | undefined;

        if (auditService) {
          const entityId =
            result && typeof result === 'object' && 'id' in result
              ? (result as { id: string }).id
              : undefined;

          await auditService.log({
            action: options.action,
            entityType: options.entityType,
            entityId,
            after:
              result && typeof result === 'object'
                ? (result as Record<string, unknown>)
                : undefined,
          });
        }
      } catch {
        // Audit logging failures must not break the main operation
      }

      return result;
    };

    return descriptor;
  };
}
