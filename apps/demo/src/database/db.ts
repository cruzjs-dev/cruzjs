/**
 * Typed Drizzle database helpers
 *
 * This module provides properly typed database instances and utilities
 * that work with the Aurora schema.
 */

import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

/**
 * Typed Drizzle database for D1 (production)
 */
export type TypedD1Database = DrizzleD1Database<typeof schema>;

/**
 * Typed Drizzle database for BetterSQLite3 (development/testing)
 */
export type TypedSQLiteDatabase = BetterSQLite3Database<typeof schema>;

/**
 * Union type for both database types
 * Use this when you need to support both environments
 */
export type TypedDatabase = TypedD1Database | TypedSQLiteDatabase;

// Re-export schema for convenience
export * from './schema';
