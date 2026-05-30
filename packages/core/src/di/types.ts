/**
 * Aurora DI Types
 *
 * Core type definitions for the Aurora dependency injection system.
 */

/**
 * A typed token that can be used as a service identifier.
 * The phantom type parameter preserves type information for resolution.
 *
 * This is a branded symbol type that maintains compatibility with Inversify's
 * ServiceIdentifier while providing type safety.
 */
export type Token<T> = symbol & { readonly __type?: T };

/**
 * A class constructor type
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ServiceClass<T = unknown> = new (...args: any[]) => T;

/**
 * A service identifier - either a class or a symbol token
 */
export type ServiceIdentifier<T = unknown> = ServiceClass<T> | Token<T> | symbol;

/**
 * Options for the @Injectable() decorator
 */
export interface InjectableOptions {
  /**
   * Custom token name. Defaults to the class name.
   * Use this when you need a specific token name that differs from the class name.
   */
  name?: string;
}
