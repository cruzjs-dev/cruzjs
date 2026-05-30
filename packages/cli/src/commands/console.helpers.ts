/**
 * Console REPL helpers: pretty-print writer, tab completer, help text.
 */

import * as util from 'node:util';
import type * as repl from 'node:repl';
import type { ConsoleContext } from './console.context';

/**
 * Help text displayed on startup and via .help
 */
export const HELP_TEXT = `
  Available globals:
    db          Drizzle database instance
    schema      Database schema objects
    services    All DI services (tab-complete)
    container   Raw DI container
    config      App configuration

  Helper functions:
    query(sql)              Run raw SQL and return rows
    find(table)             Quick lookup: db.select().from(schema[table])

  REPL commands:
    .tables                 List all tables with row counts
    .describe <table>       Show table columns (name, type, nullable, pk)
    .services               List all registered DI services
    .schema                 List schema tables
    .help                   Show this help text
    .exit                   Exit the console
`;

/**
 * Create a pretty-print writer for the REPL output.
 * Uses util.inspect with colors for readable object output.
 */
export function createWriter(): (output: unknown) => string {
  return (output: unknown): string => {
    if (output === undefined) {
      return '';
    }
    if (typeof output === 'string') {
      return output;
    }
    return util.inspect(output, {
      colors: true,
      depth: 4,
      maxArrayLength: 50,
      maxStringLength: 200,
      sorted: true,
    });
  };
}

/**
 * Create a tab completer that includes service names, schema tables,
 * and .describe table-name completions.
 */
export function createCompleter(context: ConsoleContext): repl.REPLCompleter {
  const schemaNames = Object.keys(context.schema);
  const globalNames = ['db', 'container', 'schema', 'services', 'config', 'query', 'find'];

  // Use serviceNames from context (extracted from DI container during build)
  const svcNames = context.serviceNames ?? [];

  const allCompletions = [
    ...globalNames,
    ...svcNames.map((s) => `services.${s}`),
    ...schemaNames.map((s) => `schema.${s}`),
  ];

  // Gather actual database table names for .describe completion
  let dbTableNames: string[] = [];
  if (context.rawDb) {
    try {
      dbTableNames = (context.rawDb.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE '__drizzle%' ORDER BY name`
      ).all() as { name: string }[]).map((t) => t.name);
    } catch {
      // Not critical
    }
  }

  return (line: string, callback: (err: Error | null, result: [string[], string]) => void) => {
    // Handle .describe <tab> completion
    if (line.startsWith('.describe ')) {
      const partial = line.slice('.describe '.length);
      const tableHits = dbTableNames.filter((t) => t.startsWith(partial));
      const completions = tableHits.map((t) => `.describe ${t}`);
      callback(null, [completions.length ? completions : dbTableNames.map((t) => `.describe ${t}`), line]);
      return;
    }

    const hits = allCompletions.filter((c) => c.startsWith(line));
    callback(null, [hits.length ? hits : allCompletions, line]);
  };
}
