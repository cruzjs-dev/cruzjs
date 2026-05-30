/**
 * @Trace Method Decorator
 *
 * Automatically wraps a service method in a tracing span.
 * Uses TracingService from the DI container to create and manage spans.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   @Trace('UserService.getById', { kind: 'internal' })
 *   async getById(id: string) { ... }
 * }
 * ```
 */

import type { SpanKind } from './tracing.types';

const TRACE_METADATA_KEY = Symbol.for('cruzjs:trace');

export type TraceDecoratorConfig = {
  name?: string;
  kind?: SpanKind;
  attributes?: Record<string, string | number | boolean>;
};

/**
 * Method decorator that auto-creates a span for a service method.
 *
 * The span name defaults to `ClassName.methodName` if not provided.
 * The decorated method must be async or return a Promise.
 *
 * Note: This decorator wraps the method at definition time. The
 * TracingService must be available via `getAppContainer()` at call time.
 */
export function Trace(
  name?: string,
  options?: { kind?: SpanKind; attributes?: Record<string, string | number | boolean> },
): MethodDecorator {
  return function (_target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const spanName = name ?? `${_target.constructor.name}.${String(propertyKey)}`;

    descriptor.value = async function (this: any, ...args: any[]) {
      // Lazy import to avoid circular dependency at module load time
      const { getAppContainer } = await import('@cruzjs/core');
      const { TracingService } = await import('./tracing.service');

      let tracingService: InstanceType<typeof TracingService> | null = null;
      try {
        const container = await getAppContainer();
        tracingService = container.resolve(TracingService);
      } catch {
        // TracingService not registered — call original method without tracing
      }

      if (!tracingService) {
        return originalMethod.apply(this, args);
      }

      return tracingService.trace(
        spanName,
        () => originalMethod.apply(this, args),
        { kind: options?.kind, attributes: options?.attributes },
      );
    };

    // Preserve metadata
    Reflect.defineMetadata(
      TRACE_METADATA_KEY,
      { name: spanName, ...options },
      _target,
      propertyKey,
    );

    return descriptor;
  };
}

/**
 * Retrieve the Trace decorator metadata from a method.
 */
export function getTraceMetadata(
  target: any,
  propertyKey: string,
): TraceDecoratorConfig | undefined {
  return Reflect.getMetadata(TRACE_METADATA_KEY, target, propertyKey);
}
