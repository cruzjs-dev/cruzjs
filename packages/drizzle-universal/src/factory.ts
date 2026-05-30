import { getDialectBuilder } from './registry';
import type { DialectBuilder, UniversalBuilder } from './types';

/**
 * Creates a dialect-agnostic schema factory.
 *
 * At runtime the builder is always resolved from the active registry
 * (`setDialectBuilder()`), so the factory runs unchanged on SQLite (D1),
 * PostgreSQL, and MySQL.
 *
 * At compile-time `b` is contextually typed as `UniversalBuilder` — a truly
 * dialect-agnostic interface whose column methods return `UCB<T>` (Universal
 * Column Builder) with proper data types, nullability, and default tracking.
 *
 * For schemas with FK refs, annotate `b: UniversalBuilder` explicitly (required
 * because TypeScript cannot contextually type `b` when `refs` is also annotated),
 * and wrap cross-table column refs in `fkRef()` for `.references()` calls:
 *
 * ```ts
 * import type { UniversalBuilder, TableRef } from '@cruzjs/drizzle-universal';
 * import { fkRef } from '@cruzjs/drizzle-universal';
 *
 * export const createWebhookSchema = DrizzleUniversalFactory.create(
 *   (b: UniversalBuilder, refs: {
 *     organizations: TableRef<{ id: string }>;
 *   }) => ({
 *     webhooks: b.table('Webhook', {
 *       orgId: b.text('orgId').references(() => fkRef(refs.organizations.id)),
 *     }),
 *   }),
 * );
 * ```
 *
 * For PG/MySQL, swap `UniversalBuilder` for `PgBuilder` / `MySQLBuilder`.
 *
 * @example — no refs (b contextually typed, no annotation needed)
 * ```ts
 * export const createAuditSchema = DrizzleUniversalFactory.create((b) => ({
 *   auditLogs: b.table('AuditLog', { id: b.text('id').primaryKey() }),
 * }));
 * ```
 */

// ─── Default overloads (b contextually typed as UniversalBuilder) ────────────

// No refs
function _create<TSchema extends Record<string, unknown>>(
  fn: (builder: UniversalBuilder) => TSchema,
): () => TSchema;

// With FK refs
function _create<TRefs extends object, TSchema extends Record<string, unknown>>(
  fn: (builder: UniversalBuilder, refs: TRefs) => TSchema,
): (refs: TRefs) => TSchema;

// ─── Explicit builder overloads (PG / MySQL — annotate b: PgBuilder etc.) ───

// No refs, explicit builder
function _create<B extends DialectBuilder, TSchema extends Record<string, unknown>>(
  fn: (builder: B) => TSchema,
): () => TSchema;

// With FK refs, explicit builder
function _create<B extends DialectBuilder, TRefs extends object, TSchema extends Record<string, unknown>>(
  fn: (builder: B, refs: TRefs) => TSchema,
): (refs: TRefs) => TSchema;

// ─── Implementation (runtime always uses registry) ───────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _create(fn: (builder: any, refs?: any) => any): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (refs?: any) => fn(getDialectBuilder(), refs);
}

export const DrizzleUniversalFactory = { create: _create };
