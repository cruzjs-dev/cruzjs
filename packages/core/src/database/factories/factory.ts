/**
 * Database Factory System
 *
 * Provides a `defineFactory()` helper for building and inserting test/seed data
 * using @faker-js/faker.  Works with any Drizzle table via the CruzDatabase
 * interface.
 *
 * @example
 * ```ts
 * import { defineFactory } from '@cruzjs/core/database/factories';
 * import { faker } from '@faker-js/faker';
 * import * as schema from './schema';
 *
 * const UserFactory = defineFactory(() => ({
 *   id: crypto.randomUUID(),
 *   email: faker.internet.email(),
 *   isAdmin: false,
 * })).state('admin', { isAdmin: true });
 *
 * // Plain object (no DB):
 * const user = UserFactory.build();
 * const admin = UserFactory.state('admin').build();
 *
 * // Inserted into DB:
 * const user = await UserFactory.create(db, schema.users);
 * const admin = await UserFactory.state('admin').create(db, schema.users);
 * ```
 */

import type { Table, TableConfig } from 'drizzle-orm';
import type { CruzDatabase } from '../../shared/database/cruz-database';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * A factory instance returned by `defineFactory()`.
 *
 * @typeParam T - The shape of the plain object the factory produces.
 */
export interface Factory<T extends Record<string, unknown>> {
  /**
   * Build a plain object without touching the database.
   * Calls the defaults function each time so every object gets fresh faker values.
   */
  build(overrides?: Partial<T>): T;

  /**
   * Build an array of plain objects.
   */
  buildMany(count: number, overrides?: Partial<T>): T[];

  /**
   * Insert a single record into the database and return the full row.
   *
   * @param db    - CruzDatabase (or any Drizzle-compatible db)
   * @param table - The Drizzle table to insert into
   */
  create<TTable extends Table<TableConfig>>(
    db: CruzDatabase,
    table: TTable,
    overrides?: Partial<T>,
  ): Promise<TTable['$inferSelect']>;

  /**
   * Insert multiple records and return all inserted rows.
   */
  createMany<TTable extends Table<TableConfig>>(
    db: CruzDatabase,
    table: TTable,
    count: number,
    overrides?: Partial<T>,
  ): Promise<TTable['$inferSelect'][]>;

  /**
   * Define a named state (with overrides) or retrieve one (without overrides).
   *
   * Defining: `factory.state('admin', { isAdmin: true })` — registers the state
   *   and returns the same factory (chainable for registering multiple states).
   *
   * Using: `factory.state('admin')` — returns a new factory whose defaults merge
   *   the base defaults with the registered 'admin' overrides.
   */
  state(name: string, overrides: Partial<T> | (() => Partial<T>)): Factory<T>;
  state(name: string): Factory<T>;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type StateRegistry<T> = Map<string, Partial<T> | (() => Partial<T>)>;

function makeFactory<T extends Record<string, unknown>>(
  baseDefaults: () => T,
  registry: StateRegistry<T>,
): Factory<T> {
  const self: Factory<T> = {
    build(overrides?: Partial<T>): T {
      return { ...baseDefaults(), ...overrides } as T;
    },

    buildMany(count: number, overrides?: Partial<T>): T[] {
      return Array.from({ length: count }, () => self.build(overrides));
    },

    async create<TTable extends Table<TableConfig>>(
      db: CruzDatabase,
      table: TTable,
      overrides?: Partial<T>,
    ): Promise<TTable['$inferSelect']> {
      const data = self.build(overrides);
      const [result] = await db.insert(table).values(data as TTable['$inferInsert']).returning();
      return result;
    },

    async createMany<TTable extends Table<TableConfig>>(
      db: CruzDatabase,
      table: TTable,
      count: number,
      overrides?: Partial<T>,
    ): Promise<TTable['$inferSelect'][]> {
      const items = self.buildMany(count, overrides);
      return db.insert(table).values(items as TTable['$inferInsert'][]).returning();
    },

    state(name: string, overrides?: Partial<T> | (() => Partial<T>)): Factory<T> {
      if (overrides !== undefined) {
        registry.set(name, overrides);
        return self;
      }

      const stored = registry.get(name);
      if (!stored) throw new Error(`Unknown factory state: "${name}"`);
      const resolveOverrides = typeof stored === 'function' ? stored : () => stored;
      return makeFactory(() => ({ ...baseDefaults(), ...resolveOverrides() }), registry);
    },
  };

  return self;
}

// ---------------------------------------------------------------------------
// defineFactory
// ---------------------------------------------------------------------------

/**
 * Define a reusable factory for building and inserting records.
 *
 * The `defaults` callback is invoked on every `.build()` / `.create()` call,
 * so faker values are unique per instance.
 *
 * @param defaults - A zero-argument function returning the default field values.
 *                   Typically uses `faker` and `createId()` / `crypto.randomUUID()`.
 */
export function defineFactory<T extends Record<string, unknown>>(
  defaults: () => T,
): Factory<T> {
  return makeFactory(defaults, new Map());
}
