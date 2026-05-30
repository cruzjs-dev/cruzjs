/**
 * Versioning Decorators
 *
 * Decorators for marking routers and procedures with version metadata.
 * Works with the OOP TrpcRouter pattern for declarative versioning.
 *
 * @example
 * ```typescript
 * @Router()
 * @Version('v2')
 * export class UsersV2Trpc extends TrpcRouter {
 *   @Deprecated(new Date('2025-06-01'))
 *   @Route() legacyList = publicProcedure.query(...);
 *
 *   @Version('v2')
 *   @Route() list = publicProcedure.query(...);
 * }
 * ```
 */

import type { ApiVersion, VersionInfo } from './versioning.types';

const VERSION_METADATA_KEY = Symbol.for('cruzjs:version');
const DEPRECATED_METADATA_KEY = Symbol.for('cruzjs:deprecated');

/**
 * Mark a router class or a route method with a specific API version.
 */
export function Version(version: ApiVersion): ClassDecorator & MethodDecorator {
  return function (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) {
    if (propertyKey !== undefined) {
      // Method decorator
      Reflect.defineMetadata(VERSION_METADATA_KEY, version, target, propertyKey);
      return descriptor;
    }
    // Class decorator
    Reflect.defineMetadata(VERSION_METADATA_KEY, version, target);
    return target;
  } as ClassDecorator & MethodDecorator;
}

/**
 * Mark a router class or a route method as deprecated with an optional sunset date.
 */
export function Deprecated(sunsetDate?: Date): ClassDecorator & MethodDecorator {
  return function (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) {
    const meta = { deprecated: true, sunsetDate };
    if (propertyKey !== undefined) {
      Reflect.defineMetadata(DEPRECATED_METADATA_KEY, meta, target, propertyKey);
      return descriptor;
    }
    Reflect.defineMetadata(DEPRECATED_METADATA_KEY, meta, target);
    return target;
  } as ClassDecorator & MethodDecorator;
}

/**
 * Retrieve the version metadata from a class or method.
 * Returns a VersionInfo object if metadata is present, undefined otherwise.
 */
export function getVersionMetadata(target: any, propertyKey?: string | symbol): VersionInfo | undefined {
  const version: ApiVersion | undefined = propertyKey
    ? Reflect.getMetadata(VERSION_METADATA_KEY, target, propertyKey)
    : Reflect.getMetadata(VERSION_METADATA_KEY, target);

  if (!version) return undefined;

  const deprecatedMeta: { deprecated: boolean; sunsetDate?: Date } | undefined = propertyKey
    ? Reflect.getMetadata(DEPRECATED_METADATA_KEY, target, propertyKey)
    : Reflect.getMetadata(DEPRECATED_METADATA_KEY, target);

  return {
    version,
    deprecated: deprecatedMeta?.deprecated ?? false,
    sunsetDate: deprecatedMeta?.sunsetDate,
  };
}

/**
 * Check if a class or method is marked as deprecated.
 */
export function isDeprecated(target: any, propertyKey?: string | symbol): boolean {
  const meta = propertyKey
    ? Reflect.getMetadata(DEPRECATED_METADATA_KEY, target, propertyKey)
    : Reflect.getMetadata(DEPRECATED_METADATA_KEY, target);
  return meta?.deprecated === true;
}

/**
 * Get the sunset date from a deprecated decorator.
 */
export function getDeprecatedSunsetDate(target: any, propertyKey?: string | symbol): Date | undefined {
  const meta = propertyKey
    ? Reflect.getMetadata(DEPRECATED_METADATA_KEY, target, propertyKey)
    : Reflect.getMetadata(DEPRECATED_METADATA_KEY, target);
  return meta?.sunsetDate;
}
