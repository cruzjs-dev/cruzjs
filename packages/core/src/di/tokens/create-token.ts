/**
 * Create Token Helper
 *
 * Creates typed Symbol.for() tokens for infrastructure services
 * that don't have a class (e.g., database connections, pools).
 */

import type { Token } from '../types';

/**
 * Create a typed token for dependency injection.
 *
 * Use this for infrastructure dependencies that aren't class-based,
 * such as database connections, configuration objects, or external clients.
 *
 * @example
 * ```typescript
 * // Create typed tokens for infrastructure
 * export const DRIZZLE = createToken<DrizzleDatabase>('DrizzleDatabase');
 * export const POOL = createToken<Pool>('Pool');
 * export const REDIS = createToken<Redis>('Redis');
 *
 * // Use in container binding
 * container.bind(DRIZZLE).toConstantValue(db);
 *
 * // Use in injection
 * constructor(@Inject(DRIZZLE) private db: DrizzleDatabase) {}
 * ```
 *
 * @param name - The unique name for the token (used with Symbol.for)
 * @returns A typed token that can be used as a service identifier
 */
export function createToken<T>(name: string): Token<T> {
  return Symbol.for(name) as Token<T>;
}
