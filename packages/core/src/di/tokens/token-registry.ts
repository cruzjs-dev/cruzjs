/**
 * Token Registry
 *
 * Stores and retrieves Symbol.for() tokens for service classes.
 * This enables class-based dependency injection that works across
 * Vite SSR module boundaries.
 */

import 'reflect-metadata';
import type { ServiceClass } from '../types';

/**
 * Metadata key for storing tokens on class constructors.
 * Uses Symbol.for() to ensure consistency across module boundaries.
 */
const TOKEN_METADATA_KEY = Symbol.for('aurora:di:token');

/**
 * Store a token on a class constructor.
 *
 * @param target - The class constructor to store the token on
 * @param token - The symbol token to associate with the class
 */
export function setToken(target: Function, token: symbol): void {
  Reflect.defineMetadata(TOKEN_METADATA_KEY, token, target);
}

/**
 * Get the token for a service class.
 *
 * If the class has a token stored via @Injectable() or setToken(),
 * that token is returned. Otherwise, a token is generated from the
 * class name and stored for future use.
 *
 * @example
 * ```typescript
 * // For @Injectable() decorated classes
 * const token = getToken(CohortService); // Returns Symbol.for('CohortService')
 *
 * // Use in container operations
 * container.bind(getToken(CohortService)).to(CohortService);
 * const service = container.get(getToken(CohortService));
 * ```
 *
 * @param target - The service class to get the token for
 * @returns The symbol token for the class
 */
export function getToken<T>(target: ServiceClass<T>): symbol {
  // Check metadata first (set by @Injectable() decorator)
  const existing = Reflect.getMetadata(TOKEN_METADATA_KEY, target);
  if (existing) {
    return existing;
  }

  // Generate and store token for non-decorated classes
  // This enables getToken() to work even without @Injectable()
  const token = Symbol.for(target.name);
  setToken(target, token);
  return token;
}

/**
 * Check if a class has an explicitly set token.
 *
 * @param target - The class to check
 * @returns True if the class has a token set via @Injectable() or setToken()
 */
export function hasToken(target: Function): boolean {
  return Reflect.hasMetadata(TOKEN_METADATA_KEY, target);
}
