/**
 * Observer Registry
 *
 * Central registry that maps table names to their model observers.
 * Injectable singleton -- register observers at module boot time.
 *
 * @example
 * ```typescript
 * const registry = container.resolve(ObserverRegistry);
 * registry.register('MyItems', new MyItemObserver());
 * ```
 */

import { Injectable } from '../../di';
import type { IModelObserver } from './observer.interface';

@Injectable()
export class ObserverRegistry {
  private observers = new Map<string, IModelObserver[]>();

  /**
   * Register an observer for a given table name.
   * Multiple observers can be registered for the same table.
   */
  register(tableName: string, observer: IModelObserver): void {
    const existing = this.observers.get(tableName) || [];
    existing.push(observer);
    this.observers.set(tableName, existing);
  }

  /**
   * Get all registered observers for a table.
   * Returns an empty array if no observers are registered.
   */
  getObservers(tableName: string): IModelObserver[] {
    return this.observers.get(tableName) || [];
  }

  /**
   * Check whether any observers are registered for a table.
   */
  hasObservers(tableName: string): boolean {
    return (this.observers.get(tableName)?.length ?? 0) > 0;
  }

  /**
   * Remove all observers for a given table. Useful for testing.
   */
  clear(tableName?: string): void {
    if (tableName) {
      this.observers.delete(tableName);
    } else {
      this.observers.clear();
    }
  }
}
