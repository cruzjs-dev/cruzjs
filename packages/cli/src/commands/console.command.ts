/**
 * cruz console — Interactive REPL with full framework context.
 *
 * Launches a Node.js REPL with:
 *  - Drizzle DB instance as `db`
 *  - DI container as `container`
 *  - Service proxy as `services.ServiceName`
 *  - Database schema as `schema`
 *  - Helper functions: query(), find()
 *  - Custom commands: .services, .schema, .tables, .describe
 *
 * Runs in Node.js (not CF Workers), uses local SQLite for database.
 */

import * as repl from 'node:repl';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as vm from 'node:vm';
import { buildContext, type ConsoleContext } from './console.context';
import { createWriter, createCompleter, HELP_TEXT } from './console.helpers';

export interface ConsoleCommandOptions {
  projectRoot: string;
  env?: string;
  /** When true, execute stdin and exit (for testing / scripting) */
  eval?: string;
}

/**
 * Main entry point for `cruz console`.
 * Bypasses Ink — writes directly to stdout and starts a Node.js REPL.
 */
export async function consoleCommand(options: ConsoleCommandOptions): Promise<void> {
  const { projectRoot, env = 'development' } = options;

  console.log('CruzJS Interactive Console');
  console.log(`Environment: ${env}`);
  console.log('─'.repeat(37));
  console.log('Loading framework context...\n');

  // Build context (db, container, schema, services)
  const context = await buildContext(projectRoot, env);

  console.log('');
  console.log('Available:');
  console.log('  db                   Drizzle database instance');
  console.log('  schema               Database schema objects');
  console.log('  services             All DI services (tab-complete)');
  console.log('  container            Raw DI container');
  console.log('  config               App configuration');
  console.log('  query(sql)           Run raw SQL');
  console.log('  find(table)          Quick lookup');
  console.log('');
  console.log('Commands:');
  console.log('  .tables              List all tables with row counts');
  console.log('  .describe <table>    Show table columns');
  console.log('  .services            List all registered DI services');
  console.log('  .schema              List schema tables');
  console.log('  .help                Show all commands');
  console.log('');

  // If --eval flag, evaluate and exit (for scripting / E2E tests)
  if (options.eval) {
    return evalAndExit(options.eval, context);
  }

  // Check if stdin is a TTY — if not, read from pipe and exit
  if (!process.stdin.isTTY) {
    return readPipeAndExit(context);
  }

  // Start interactive REPL
  const server = repl.start({
    prompt: 'cruz> ',
    useColors: true,
    useGlobal: false,
    eval: createAsyncEval(),
    writer: createWriter(),
    completer: createCompleter(context),
  });

  // Inject context variables into the REPL
  injectContext(server.context, context);

  // ── Custom REPL commands ─────────────────────────────────────────────────

  server.defineCommand('services', {
    help: 'List all registered DI services',
    action() {
      if (!context.container) {
        console.log('Container not initialized.');
      } else {
        try {
          // Inversify stores bindings in a dictionary keyed by service identifier
          const bindings = (context.container as any)._bindingDictionary?._map;
          if (bindings) {
            const keys: string[] = [];
            for (const [key] of bindings) {
              const name = typeof key === 'symbol' ? key.description ?? key.toString() : String(key);
              keys.push(name);
            }
            keys.sort();
            console.log(`\nRegistered services (${keys.length}):\n`);
            for (const key of keys) {
              console.log(`  - ${key}`);
            }
            console.log('');
          } else {
            console.log('Could not inspect container bindings.');
          }
        } catch (err) {
          console.log('Error listing services:', err);
        }
      }
      this.displayPrompt();
    },
  });

  server.defineCommand('schema', {
    help: 'Show database schema tables',
    action() {
      const tables = Object.keys(context.schema);
      if (tables.length === 0) {
        console.log('No schema tables loaded.');
      } else {
        console.log(`\nSchema tables (${tables.length}):\n`);
        for (const table of tables.sort()) {
          console.log(`  - ${table}`);
        }
        console.log('');
      }
      this.displayPrompt();
    },
  });

  server.defineCommand('tables', {
    help: 'Show database tables with row counts',
    action() {
      if (!context.rawDb) {
        console.log('Database not initialized.');
        this.displayPrompt();
        return;
      }

      try {
        const tables = context.rawDb.prepare(
          `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE '__drizzle%' ORDER BY name`
        ).all() as { name: string }[];

        console.log(`\nTables (${tables.length}):\n`);

        for (const table of tables) {
          try {
            const row = context.rawDb!.prepare(`SELECT COUNT(*) as count FROM "${table.name}"`).get() as { count: number };
            console.log(`  ${table.name.padEnd(35)} ${row.count} rows`);
          } catch {
            console.log(`  ${table.name.padEnd(35)} (error)`);
          }
        }
        console.log('');
      } catch (err) {
        console.log('Error listing tables:', err);
      }
      this.displayPrompt();
    },
  });

  server.defineCommand('describe', {
    help: 'Show columns for a table: .describe <tableName>',
    action(tableName: string) {
      if (!context.rawDb) {
        console.log('Database not initialized.');
        this.displayPrompt();
        return;
      }

      if (!tableName?.trim()) {
        console.log('Usage: .describe <tableName>');
        this.displayPrompt();
        return;
      }

      const name = tableName.trim();

      try {
        const columns = context.rawDb.prepare(`PRAGMA table_info("${name}")`).all() as Array<{
          name: string;
          type: string;
          notnull: number;
          dflt_value: string | null;
          pk: number;
        }>;

        if (columns.length === 0) {
          console.log(`Table "${name}" not found.`);
        } else {
          console.log(`\nTable: ${name} (${columns.length} columns)\n`);
          console.log('  ' + 'NAME'.padEnd(28) + 'TYPE'.padEnd(20) + 'NULLABLE  PK  DEFAULT');
          console.log('  ' + '─'.repeat(75));
          for (const col of columns) {
            const nullable = col.notnull ? 'NO' : 'YES';
            const pk = col.pk ? 'Y' : '';
            const dflt = col.dflt_value ?? '';
            console.log(`  ${col.name.padEnd(28)} ${col.type.padEnd(20)} ${nullable.padEnd(10)}${pk.padEnd(4)}${dflt}`);
          }
          console.log('');
        }
      } catch (err) {
        console.log('Error describing table:', err);
      }
      this.displayPrompt();
    },
  });

  // ── History persistence ──────────────────────────────────────────────────

  const cruzDir = path.join(projectRoot, '.cruz');
  if (!fs.existsSync(cruzDir)) {
    fs.mkdirSync(cruzDir, { recursive: true });
  }
  const historyPath = path.join(cruzDir, 'console-history');
  server.setupHistory(historyPath, () => {});

  // ── Wait for exit ────────────────────────────────────────────────────────

  return new Promise<void>((resolve) => {
    server.on('exit', () => {
      console.log('\nGoodbye!');
      resolve();
    });
  });
}

/**
 * Create an async-aware eval function for the REPL.
 * Wraps expressions in an async IIFE so `await` works at the top level.
 */
function createAsyncEval(): repl.REPLEval {
  return function asyncEval(
    code: string,
    context: vm.Context,
    _filename: string,
    callback: (err: Error | null, result?: unknown) => void,
  ): void {
    // Node REPL wraps input in parens: `(expression\n)` — we need the raw code
    const trimmed = code.trim();

    // Skip empty input
    if (!trimmed || trimmed === '(\n)') {
      callback(null, undefined);
      return;
    }

    // Try direct eval first (handles simple expressions)
    try {
      const result = vm.runInContext(trimmed, context);

      // If result is a Promise, wait for it
      if (result && typeof result === 'object' && typeof result.then === 'function') {
        result
          .then((resolved: unknown) => callback(null, resolved))
          .catch((err: Error) => callback(err));
        return;
      }

      callback(null, result);
      return;
    } catch {
      // Fall through to async wrapper
    }

    // Wrap in async IIFE for `await` support
    const asyncCode = `(async () => { return ${trimmed} })()`;
    try {
      const result = vm.runInContext(asyncCode, context);
      if (result && typeof result.then === 'function') {
        result
          .then((resolved: unknown) => callback(null, resolved))
          .catch((err: Error) => callback(err));
      } else {
        callback(null, result);
      }
    } catch {
      // Try as a statement (no return)
      const stmtCode = `(async () => { ${trimmed} })()`;
      try {
        const result = vm.runInContext(stmtCode, context);
        if (result && typeof result.then === 'function') {
          result
            .then((resolved: unknown) => callback(null, resolved))
            .catch((err: Error) => callback(err));
        } else {
          callback(null, result);
        }
      } catch (err) {
        callback(err instanceof Error ? err : new Error(String(err)));
      }
    }
  };
}

/**
 * Inject the console context into the REPL's context object.
 */
function injectContext(replContext: Record<string, unknown>, consoleCtx: ConsoleContext): void {
  replContext.db = consoleCtx.db;
  replContext.container = consoleCtx.container;
  replContext.services = consoleCtx.services;
  replContext.schema = consoleCtx.schema;
  replContext.config = consoleCtx.config;
  replContext.query = consoleCtx.query;
  replContext.find = consoleCtx.find;
  replContext.help = HELP_TEXT;
}

/**
 * Evaluate a single expression in a vm context, handling async/await.
 * Tries direct eval first, then wraps in async IIFE.
 */
async function evalExpression(code: string, ctx: vm.Context): Promise<unknown> {
  const trimmed = code.trim();
  if (!trimmed) return undefined;

  // Try direct eval first
  try {
    const result = vm.runInContext(trimmed, ctx);
    if (result && typeof result === 'object' && typeof result.then === 'function') {
      return await result;
    }
    return result;
  } catch {
    // Fall through to async wrapper
  }

  // Wrap in async IIFE for await support
  try {
    const asyncCode = `(async () => { return ${trimmed} })()`;
    const result = await vm.runInContext(asyncCode, ctx);
    return result;
  } catch {
    // Try as a statement (no return)
  }

  const stmtCode = `(async () => { ${trimmed} })()`;
  const result = await vm.runInContext(stmtCode, ctx);
  return result;
}

/**
 * Evaluate a string expression and exit (for --eval flag or piped input).
 */
async function evalAndExit(code: string, context: ConsoleContext): Promise<void> {
  const ctx = vm.createContext({});
  injectContext(ctx, context);

  try {
    const result = await evalExpression(code, ctx);
    if (result !== undefined) {
      console.log(createWriter()(result));
    }
  } catch (err) {
    console.error('Error:', err);
    process.exitCode = 1;
  }
}

/**
 * Read all of stdin, evaluate each line, and exit.
 * Used when input is piped: `echo "1 + 1" | cruz console`
 */
async function readPipeAndExit(context: ConsoleContext): Promise<void> {
  const chunks: Buffer[] = [];

  return new Promise<void>((resolve) => {
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', async () => {
      const input = Buffer.concat(chunks).toString('utf-8').trim();
      if (!input) {
        resolve();
        return;
      }

      const lines = input.split('\n');
      const ctx = vm.createContext({});
      injectContext(ctx, context);

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
          continue;
        }

        try {
          const result = await evalExpression(trimmed, ctx);
          if (result !== undefined) {
            console.log(createWriter()(result));
          }
        } catch (err) {
          console.error(`Error evaluating "${trimmed}":`, err);
        }
      }

      resolve();
    });
  });
}
