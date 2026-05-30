/**
 * UseConnection Decorator
 *
 * Method decorator that stores metadata indicating which database
 * connection (by name or role) the method should route to.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class ReportService {
 *   @UseConnection('analytics')
 *   async generateReport(): Promise<Report> {
 *     // This method is tagged to use the 'analytics' connection
 *   }
 *
 *   @UseConnection(ConnectionRole.REPLICA)
 *   async readData(): Promise<Data> {
 *     // This method is tagged to use a replica connection
 *   }
 * }
 * ```
 */

import type { ConnectionRole } from './multi-database.types';

const USE_CONNECTION_METADATA_KEY = Symbol.for('cruzjs:use-connection');

/**
 * Decorator that marks a method to use a specific database connection.
 *
 * @param nameOrRole - Connection name or ConnectionRole value
 */
export function UseConnection(nameOrRole: string | ConnectionRole): MethodDecorator {
  return function (_target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(USE_CONNECTION_METADATA_KEY, nameOrRole, _target, propertyKey);
    return descriptor;
  };
}

/**
 * Retrieve the UseConnection decorator metadata from a method.
 */
export function getConnectionRoute(target: any, propertyKey: string): string | undefined {
  return Reflect.getMetadata(USE_CONNECTION_METADATA_KEY, target, propertyKey);
}
