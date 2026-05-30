/**
 * Injectable Decorator
 *
 * Marks a class as injectable and auto-generates a Symbol.for() token.
 * This replaces Inversify's @injectable() with Aurora-aware token management.
 */

import { injectable } from 'inversify';
import { setToken } from '../tokens/token-registry';
import type { InjectableOptions } from '../types';

/**
 * Mark a class as injectable with automatic token generation.
 *
 * This decorator:
 * 1. Generates a Symbol.for() token from the class name (or custom name)
 * 2. Stores the token in class metadata for retrieval via getToken()
 * 3. Applies Inversify's @injectable() decorator
 *
 * @example
 * ```typescript
 * // Basic usage - token is Symbol.for('CohortService')
 * @Injectable()
 * export class CohortService {
 *   constructor(@Inject(DrizzleService) private db: DrizzleDatabase) {}
 * }
 *
 * // Custom token name - token is Symbol.for('CustomName')
 * @Injectable({ name: 'CustomName' })
 * export class MyService {}
 * ```
 *
 * @param options - Optional configuration for the decorator
 * @returns A class decorator
 */
export function Injectable(options?: InjectableOptions): ClassDecorator {
  return <TFunction extends Function>(target: TFunction): TFunction | void => {
    // Generate token from class name or custom name
    const tokenName = options?.name || target.name;
    const token = Symbol.for(tokenName);

    // Store in metadata for later retrieval via getToken()
    setToken(target, token);

    // Apply Inversify's injectable decorator
    // Use unknown then to the expected type to satisfy strict type checking
    injectable()(target as unknown as new (...args: never[]) => object);
  };
}
