/**
 * @Observable Decorator
 *
 * Marks a class as a model observer for a specific table and makes it injectable.
 * The table name is stored in reflect-metadata so the framework can auto-register
 * the observer with the ObserverRegistry.
 *
 * @example
 * ```typescript
 * @Observable('MyItems')
 * export class MyItemObserver implements IModelObserver<MyItem> {
 *   creating(entity: MyItem): void {
 *     entity.slug = slugify(entity.name);
 *   }
 *
 *   created(entity: MyItem): void {
 *     console.log(`MyItem created: ${entity.id}`);
 *   }
 * }
 * ```
 */

import 'reflect-metadata';
import { Injectable } from '../../di';

const OBSERVABLE_TABLE_KEY = Symbol.for('cruz:observable:table');

/**
 * Decorator that marks a class as a model observer for the given table.
 * Automatically applies `@Injectable()` so the class can be registered in DI.
 *
 * @param tableName - The Drizzle table name this observer watches
 */
export function Observable(tableName: string): ClassDecorator {
  return (target: Function) => {
    Reflect.defineMetadata(OBSERVABLE_TABLE_KEY, tableName, target);
    // Apply Injectable so it can be resolved from the DI container
    Injectable()(target);
  };
}

/**
 * Retrieve the table name associated with an @Observable-decorated class.
 *
 * @param target - The class (constructor function) to inspect
 * @returns The table name, or undefined if the class is not decorated with @Observable
 */
export function getObservableTable(target: Function): string | undefined {
  return Reflect.getMetadata(OBSERVABLE_TABLE_KEY, target);
}
