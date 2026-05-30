/**
 * Database Seeder Interface
 *
 * Implement this interface to define a seeder class. Seeders are discovered
 * from `apps/web/src/database/seeders/*.ts` and run in filename order.
 *
 * @example
 * ```ts
 * // apps/web/src/database/seeders/001-users.ts
 * import type { Seeder } from '@cruzjs/core';
 * import type { CruzDatabase } from '@cruzjs/core';
 *
 * export default class UsersSeeder implements Seeder {
 *   async run(db: CruzDatabase): Promise<void> {
 *     await db.insert(users).values([
 *       { id: 'u1', email: 'admin@example.com', name: 'Admin' },
 *     ]);
 *   }
 * }
 * ```
 */

import type { CruzDatabase } from '../../shared/database/cruz-database';

/**
 * A database seeder. Each seeder file should default-export a class
 * implementing this interface.
 */
export interface Seeder {
  /** Run the seeder. Insert/upsert seed data using the provided database. */
  run(db: CruzDatabase): Promise<void>;
}

/**
 * Constructor type for a Seeder class (used by the runner to instantiate).
 */
export type SeederClass = new () => Seeder;
