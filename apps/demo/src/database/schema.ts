/**
 * Application Database Schema
 *
 * Re-exports all tables from @cruzjs/core, @cruzjs/saas, and @cruzjs/start.
 * App-specific tables can be added below.
 *
 * DIALECT SUPPORT
 * ───────────────
 * The default exports below use the SQLite builder (backwards-compatible with
 * D1 / local dev). To target a different dialect at runtime, call
 * `setDialectBuilder(pgBuilder)` from your runtime adapter before the app
 * boots, then build the schema using `createStartSchema(getDialectBuilder())`.
 *
 * See `@cruzjs/drizzle-universal` for the full builder API.
 */

// Default SQLite exports — re-exports every table with proper TypeScript types.
// These remain unchanged so all existing service imports continue to work.
export * from '@cruzjs/start/database/schema';

// App-specific tables
export * from './chatbots.schema';
export * from './pdfs.schema';

// Factory export: builds the full schema for any dialect.
// Usage in a custom setup:
//   import { pgBuilder } from '@cruzjs/drizzle-universal';
//   import { createStartSchema } from './schema';
//   const schema = createStartSchema(pgBuilder);
export { createStartSchema } from '@cruzjs/start/database/schema';

// Monitor schemas (opt-in — add these when using @cruzjs/monitor):
// export * from '@cruzjs/monitor/telescope/monitor.schema';
// export * from '@cruzjs/monitor/horizon/queue-metrics.schema';
