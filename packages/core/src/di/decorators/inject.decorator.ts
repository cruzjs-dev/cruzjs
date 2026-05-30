/**
 * Inject Decorators
 *
 * Parameter decorators for dependency injection that work with both
 * class references and symbol tokens.
 */

import {
  inject as inversifyInject,
  multiInject as inversifyMultiInject,
  optional as inversifyOptional,
} from 'inversify';
import { getToken } from '../tokens/token-registry';
import type { ServiceClass, ServiceIdentifier } from '../types';

/**
 * Resolve a service identifier to a symbol token.
 *
 * @param identifier - A class constructor or symbol token
 * @returns The symbol token for the service
 */
function resolveToken(identifier: ServiceIdentifier): symbol {
  if (typeof identifier === 'symbol') {
    return identifier;
  }
  return getToken(identifier as ServiceClass);
}

/**
 * Metadata key for storing property injection entries on a class.
 * Used by @Inject when applied as a property decorator.
 */
const PROPERTY_INJECT_KEY = Symbol.for('cruzjs:property-inject');

/**
 * Represents a single property injection entry stored on a router class.
 */
export interface PropertyInjectionEntry {
  propertyKey: string | symbol;
  token: symbol;
}

/**
 * Get all property injection entries stored on a class by @Inject property decorators.
 *
 * @param targetClass - The class constructor to inspect
 * @returns Array of property injection entries
 */
export function getPropertyInjections(targetClass: Function): PropertyInjectionEntry[] {
  return Reflect.getMetadata(PROPERTY_INJECT_KEY, targetClass) ?? [];
}

/**
 * Inject a dependency into a constructor parameter or class property.
 *
 * Accepts either a class reference or a symbol token. When a class is provided,
 * it automatically resolves to the class's Symbol.for() token.
 *
 * When used as a property decorator (e.g., on TrpcRouter classes), the injection
 * metadata is stored separately and applied manually after DI resolution.
 * Inversify v7 does not support @inject on regular properties.
 *
 * @example
 * ```typescript
 * // Constructor parameter injection
 * constructor(@Inject(CohortService) private cohortService: CohortService) {}
 *
 * // Property injection (TrpcRouter classes only)
 * @Inject(PostsService) private postsService!: PostsService;
 * ```
 *
 * @param identifier - The service class or token to inject
 * @returns A decorator usable on constructor parameters or class properties
 */
export function Inject(identifier: ServiceIdentifier): ParameterDecorator & PropertyDecorator {
  return (target: object, propertyKey: string | symbol | undefined, parameterIndex?: number) => {
    const token = resolveToken(identifier);
    if (propertyKey !== undefined && typeof parameterIndex !== 'number') {
      // Property decorator: store metadata for manual injection after DI resolution.
      // Inversify v7 does not support @inject on regular properties.
      // Note: Babel's _applyDecoratedDescriptor passes a descriptor object (not undefined)
      // as the 3rd arg for property decorators, so we check typeof !== 'number'.
      const constructor = typeof target === 'function' ? target : (target as object).constructor;
      const injections: PropertyInjectionEntry[] =
        Reflect.getMetadata(PROPERTY_INJECT_KEY, constructor) ?? [];
      injections.push({ propertyKey, token });
      Reflect.defineMetadata(PROPERTY_INJECT_KEY, injections, constructor);
    } else {
      // Parameter decorator: delegate to Inversify for constructor injection
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (inversifyInject(token) as any)(target, propertyKey, parameterIndex);
    }
  };
}

/**
 * Inject multiple implementations of a service.
 *
 * Use this when a service identifier has multiple bindings and you want
 * to receive all of them as an array.
 *
 * @example
 * ```typescript
 * // Collect all job handlers
 * constructor(
 *   @MultiInject(JOB_HANDLER)
 *   @Optional()
 *   private handlers: JobHandler[] = []
 * ) {}
 * ```
 *
 * @param identifier - The service class or token to inject
 * @returns A parameter decorator
 */
export function MultiInject(identifier: ServiceIdentifier): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    const token = resolveToken(identifier);
    inversifyMultiInject(token)(target, propertyKey, parameterIndex);
  };
}

/**
 * Mark a dependency as optional.
 *
 * When used with @Inject or @MultiInject, the dependency will not throw
 * if no binding is found. Instead, undefined (or empty array for MultiInject)
 * will be injected.
 *
 * @example
 * ```typescript
 * // Optional single dependency
 * constructor(
 *   @Inject(CacheService) @Optional() private cache?: CacheService
 * ) {}
 *
 * // Optional multi-inject with default
 * constructor(
 *   @MultiInject(JOB_HANDLER) @Optional() private handlers: JobHandler[] = []
 * ) {}
 * ```
 *
 * @returns A parameter decorator
 */
export function Optional(): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    inversifyOptional()(target, propertyKey, parameterIndex);
  };
}
