import type { DialectBuilder } from './types';
import { sqliteBuilder } from './builders/sqlite';

let _active: DialectBuilder | null = null;

/**
 * Register the active dialect builder. Called by adapters during `initialize()`.
 * Must be called before any schema factory functions are evaluated.
 */
export function setDialectBuilder(builder: DialectBuilder): void {
  _active = builder;
}

/**
 * Retrieve the currently registered dialect builder.
 * Falls back to the SQLite builder if none has been registered yet.
 */
export function getDialectBuilder(): DialectBuilder {
  if (!_active) {
    _active = sqliteBuilder;
  }
  return _active;
}

/** Reset the registry (useful in tests). */
export function resetDialectBuilder(): void {
  _active = null;
}
