// Types
export type { DialectBuilder, SupportedDialect, TableRef, BuiltTable, UniversalBuilder, UCB, UniversalTable } from './types';
export { fkRef } from './types';

// Builders
export { sqliteBuilder } from './builders/sqlite';
export type { SQLiteBuilder } from './builders/sqlite';

export { pgBuilder } from './builders/pg';
export type { PgBuilder } from './builders/pg';

export { mysqlBuilder } from './builders/mysql';
export type { MySQLBuilder } from './builders/mysql';

// Registry
export {
  setDialectBuilder,
  getDialectBuilder,
  resetDialectBuilder,
} from './registry';

// Factory helper
export { DrizzleUniversalFactory } from './factory';
