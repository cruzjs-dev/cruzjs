/**
 * Model Observer Interface
 *
 * Defines lifecycle hooks for database operations.
 * Observers are called before/after insert, update, and delete operations
 * when using the `withObservers` helper.
 *
 * All methods are optional -- implement only the hooks you need.
 *
 * @example
 * ```typescript
 * @Observable('MyItems')
 * export class MyItemObserver implements IModelObserver<MyItem> {
 *   creating(entity: MyItem): void {
 *     // Validate or transform before insert
 *   }
 *
 *   created(entity: MyItem): void {
 *     // Send notification after insert
 *   }
 * }
 * ```
 */
export interface IModelObserver<T = unknown> {
  /** Called before a new record is inserted. Throw to abort. */
  creating?(entity: T): Promise<void> | void;

  /** Called after a new record has been inserted. */
  created?(entity: T): Promise<void> | void;

  /** Called before an existing record is updated. Throw to abort. */
  updating?(id: string, changes: Partial<T>): Promise<void> | void;

  /** Called after an existing record has been updated. */
  updated?(entity: T): Promise<void> | void;

  /** Called before a record is deleted. Throw to abort. */
  deleting?(id: string): Promise<void> | void;

  /** Called after a record has been deleted. */
  deleted?(id: string): Promise<void> | void;
}
