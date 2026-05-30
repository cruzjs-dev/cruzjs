/**
 * Database Model Observers
 *
 * Opt-in lifecycle hooks for Drizzle database operations.
 *
 * @example
 * ```typescript
 * import {
 *   type IModelObserver,
 *   ObserverRegistry,
 *   Observable,
 *   withObservers,
 * } from '@cruzjs/core/database/observers';
 * ```
 */

export type { IModelObserver } from './observer.interface';
export { ObserverRegistry } from './observer.registry';
export { withObservers } from './with-observers';
export type { ObservedDb } from './with-observers';
export { Observable, getObservableTable } from './observable.decorator';
