#!/usr/bin/env -S npx tsx

import React from 'react';
import { render } from 'ink';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { App, Command } from './app';
import { loadConfig, saveConfig as saveConfigFn, Config } from './config/index';
import { runForegroundDev } from './commands/dev-server';
import { consoleCommand } from './commands/console.command';
import { routesCommand } from './commands/routes.command';

// Root directory is always where the user runs the command from
const rootDir = process.cwd();

// Parse command line arguments
function parseArgs(args: string[]): Command {
  const command = args[0]?.toLowerCase();
  const subCommand = args[1]?.toLowerCase();

  // Parse flags
  let envName: string | undefined;
  let skipBuild = false;
  let skipMigrate = false;
  let healthCheckFlag = false;
  let yes = false;
  let force = false;
  let name: string | undefined;
  let remote = false;
  let value: string | undefined;
  let params: string | undefined;
  let domain: string | undefined;
  let accountId: string | undefined;
  let ui = false;
  let watch = false;
  let coverage = false;
  let headed = false;
  let tests = false;
  let foreground = false;
  let scope: string | undefined;
  let crud = false;
  let wire = false;
  let fresh = false;
  let steps = 1;
  let integration = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-e' || arg === '--env') {
      envName = args[i + 1];
      i++;
    } else if (arg === '--skip-build') {
      skipBuild = true;
    } else if (arg === '--skip-migrate') {
      skipMigrate = true;
    } else if (arg === '--health-check') {
      healthCheckFlag = true;
    } else if (arg === '-y' || arg === '--yes') {
      yes = true;
    } else if (arg === '--force') {
      force = true;
    } else if (arg === '--remote') {
      remote = true;
    } else if (arg === '--local') {
      remote = false;
    } else if (arg === '--account-id') {
      accountId = args[i + 1];
      i++;
    } else if (arg === '-n' || arg === '--name') {
      name = args[i + 1];
      i++;
    } else if (arg === '-v' || arg === '--value') {
      value = args[i + 1];
      i++;
    } else if (arg === '--params' || arg === '-p') {
      params = args[i + 1];
      i++;
    } else if (arg === '-d' || arg === '--domain') {
      domain = args[i + 1];
      i++;
    } else if (arg === '--ui') {
      ui = true;
    } else if (arg === '--watch') {
      watch = true;
    } else if (arg === '--coverage') {
      coverage = true;
    } else if (arg === '--headed') {
      headed = true;
    } else if (arg === '--tests') {
      tests = true;
    } else if (arg === '--foreground' || arg === '-f') {
      foreground = true;
    } else if (arg === '--scope' || arg === '-s') {
      scope = args[i + 1];
      i++;
    } else if (arg === '--crud') {
      crud = true;
    } else if (arg === '--wire' || arg === '-w') {
      wire = true;
    } else if (arg === '--integration') {
      integration = true;
    } else if (arg === '--fresh') {
      fresh = true;
    } else if (arg === '--steps') {
      steps = parseInt(args[i + 1] ?? '1', 10) || 1;
      i++;
    } else if (!arg.startsWith('-') && i > 0 && !['create', 'list', 'set', 'add', 'trigger', 'instances', 'info', 'migrate', 'start', 'stop', 'restart', 'status', 'generate', 'push', 'studio', 'seed', 'hard-reset', 'dev'].includes(arg)) {
      if (!name && i === 1) {
        name = arg;
      }
    }
  }

  const cfName = name || (args[2] && !args[2].startsWith('-') ? args[2] : undefined);

  // Route to commands
  switch (command) {
    // ── Local Development ──────────────────────────────────────────────────

    case 'dev': {
      const action = subCommand as 'start' | 'stop' | 'restart' | 'status';
      if (['start', 'stop', 'restart', 'status'].includes(action)) {
        return { type: 'dev', subAction: action, foreground };
      }
      // Default: dev start
      return { type: 'dev', subAction: 'start', foreground };
    }

    case 'build':
      return { type: 'build' };

    case 'start':
      return { type: 'start' };

    case 'test':
      return { type: 'test', ui, watch, coverage, integration };

    case 'test:e2e':
    case 'teste2e':
    case 'e2e':
      return { type: 'teste2e', ui, watch, headed };

    case 'typecheck':
    case 'tsc':
      return { type: 'typecheck', tests };

    case 'worker':
      return { type: 'worker', subAction: (subCommand === 'dev' ? 'dev' : 'start') };

    // ── Database (local drizzle + D1) ──────────────────────────────────────

    case 'db': {
      const dbAction = subCommand as any;
      // Local drizzle operations
      if (dbAction === 'rollback') {
        return { type: 'db', subAction: 'rollback' as const, env: envName, remote, steps, name: undefined };
      }
      if (['generate', 'push', 'studio', 'hard-reset'].includes(dbAction)) {
        return { type: 'db', subAction: dbAction as 'generate' | 'push' | 'studio' | 'hard-reset', env: envName, remote, name: undefined };
      }
      if (dbAction === 'seed') {
        return { type: 'db', subAction: 'seed' as const, env: envName, remote, fresh, name: undefined };
      }
      // Migrate can be local or remote
      if (dbAction === 'migrate') {
        return { type: 'db', subAction: 'migrate' as const, env: envName, remote, name: undefined };
      }
      // Query: cruz db query "SELECT * FROM ..."
      if (dbAction === 'query' || dbAction === 'execute') {
        const sql = args[2];
        return { type: 'db', subAction: 'query' as const, env: envName, remote, sql, name: undefined };
      }
      // Named migration: cruz db generate:migration <name>
      if (dbAction === 'generate:migration') {
        const migrationName = args[2];
        return { type: 'db', subAction: 'generate:migration', env: envName, name: migrationName };
      }
      // Generate rollback skeleton: cruz db generate:rollback <name>
      if (dbAction === 'generate:rollback') {
        const rollbackName = args[2];
        return { type: 'db', subAction: 'generate:rollback', env: envName, name: rollbackName };
      }
      // Backup: cruz db backup [--output <file>] [--remote]
      if (dbAction === 'backup') {
        const outputIdx = args.indexOf('--output');
        const backupOutput = outputIdx !== -1 ? args[outputIdx + 1] : undefined;
        return { type: 'db', subAction: 'backup', env: envName, remote, output: backupOutput };
      }
      // Restore: cruz db restore <file> [--remote]
      if (dbAction === 'restore') {
        const restoreFile = args[2] && !args[2].startsWith('-') ? args[2] : undefined;
        return { type: 'db', subAction: 'restore', env: envName, remote, file: restoreFile };
      }
      // D1 management operations (create, list, info)
      if (['create', 'list', 'info'].includes(dbAction)) {
        return { type: 'database', subAction: dbAction, name: cfName, env: envName };
      }
      return { type: 'db', subAction: 'generate' as const, env: envName, remote, name: undefined };
    }

    case 'database':
    case 'd1':
      switch (subCommand) {
        case 'create':
          return { type: 'database', subAction: 'create', name: cfName, env: envName };
        case 'list':
        case 'ls':
          return { type: 'database', subAction: 'list' };
        case 'migrate':
          return { type: 'database', subAction: 'migrate', name: cfName, env: envName, remote };
        case 'info':
          return { type: 'database', subAction: 'info', name: cfName, env: envName };
        default:
          return { type: 'database', subAction: 'list' };
      }

    // ── Scaffold ────────────────────────────────────────────────────────────

    case 'new':
    case 'generate':
    case 'g': {
      const kind = subCommand;
      const newName = args[2] && !args[2].startsWith('-') ? args[2] : undefined;

      if (!newName) {
        // Fall through to help
        return { type: 'help' };
      }

      // cruz new queue-worker my-consumer --queue my-queue
      // Find --queue flag
      let queueName: string | undefined;
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--queue' || args[i] === '-q') {
          queueName = args[i + 1];
          break;
        }
      }

      // Parse --feature flag for new service
      let featureName: string | undefined;
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--feature') {
          featureName = args[i + 1];
          break;
        }
      }

      // Parse remaining positional args after the name as field definitions (e.g., title:string body:text)
      const fieldArgs = args.slice(3).filter(a => a.includes(':') && !a.startsWith('--'));

      switch (kind) {
        case 'worker':
          return { type: 'new', kind: 'worker', name: newName };
        case 'workflow':
          return { type: 'new', kind: 'workflow', name: newName };
        case 'queue-worker':
        case 'consumer':
          return { type: 'new', kind: 'queue-worker', name: newName, queue: queueName };
        case 'feature':
        case 'module':
          return { type: 'new-feature', name: newName, scope: (scope as 'org' | 'user' | 'global') || 'org', crud, wire, fields: fieldArgs };
        case 'package':
        case 'pkg':
          return { type: 'new-package', name: newName };
        case 'event':
          return { type: 'new-event', name: newName };
        case 'service':
          return { type: 'new-service', name: newName, feature: featureName };
        case 'job':
        case 'handler':
          return { type: 'new-job', name: newName, feature: featureName };
        case 'test': {
          const isIntegration = args.includes('--integration') || args.includes('-i');
          return { type: 'new-test', name: newName, kind: isIntegration ? 'integration' : 'unit' };
        }
        case 'crud':
          return { type: 'new-crud', name: newName, scope: (scope as 'org' | 'user' | 'global') || 'org', wire };
        case 'model':
        case 'schema':
          return { type: 'new-model', name: newName, scope: (scope as 'org' | 'user' | 'global') || 'org', wire, fields: fieldArgs };
        case 'migration':
          return { type: 'db', subAction: 'generate' as const, env: envName, remote, name: undefined };
        default:
          return { type: 'help' };
      }
    }

    // ── Deploy & Infrastructure ────────────────────────────────────────────

    case 'setup':
      return { type: 'setup' };

    case 'init': {
      const initEnv = args[1] && !args[1].startsWith('-') ? args[1] : envName;
      return { type: 'init', env: initEnv, accountId, yes };
    }

    case 'deploy': {
      const deployEnv = args[1] && !args[1].startsWith('-') ? args[1] : envName;
      return { type: 'deploy', env: deployEnv, skipBuild, skipMigrate, yes, healthCheck: healthCheckFlag };
    }

    case 'preview':
      return { type: 'deploy', env: 'preview', skipBuild, skipMigrate, yes };

    case 'status': {
      const statusEnv = args[1] && !args[1].startsWith('-') ? args[1] : envName;
      return { type: 'status', env: statusEnv };
    }

    case 'destroy': {
      const destroyEnv = args[1] && !args[1].startsWith('-') ? args[1] : envName;
      return { type: 'destroy', env: destroyEnv, yes, force };
    }

    case 'storage':
    case 'r2':
      switch (subCommand) {
        case 'create':
          return { type: 'storage', subAction: 'create', name: cfName };
        case 'list':
        case 'ls':
        default:
          return { type: 'storage', subAction: 'list' };
      }

    case 'kv':
    case 'cache':
      switch (subCommand) {
        case 'create':
          return { type: 'kv', subAction: 'create', name: cfName };
        case 'list':
        case 'ls':
        default:
          return { type: 'kv', subAction: 'list' };
      }

    case 'queue':
    case 'queues':
      switch (subCommand) {
        case 'create':
          return { type: 'queues', subAction: 'create', name: cfName };
        case 'delete':
        case 'rm':
          return { type: 'queues', subAction: 'delete', name: cfName };
        case 'list':
        case 'ls':
        default:
          return { type: 'queues', subAction: 'list' };
      }

    case 'secrets':
    case 'secret':
      switch (subCommand) {
        case 'set':
        case 'put':
          return { type: 'secrets', subAction: 'set', name: cfName, value, env: envName };
        case 'list':
        case 'ls':
        default:
          return { type: 'secrets', subAction: 'list', env: envName };
      }

    case 'domain':
    case 'domains':
      switch (subCommand) {
        case 'add':
        case 'create':
          return { type: 'domain', subAction: 'add', env: envName, domain };
        case 'list':
        case 'ls':
        default:
          return { type: 'domain', subAction: 'list', env: envName };
      }

    case 'workflows':
    case 'workflow':
    case 'wf':
      switch (subCommand) {
        case 'trigger':
          return { type: 'workflows', subAction: 'trigger', name: cfName, params };
        case 'instances':
        case 'instance':
          return { type: 'workflows', subAction: 'instances', name: cfName };
        case 'list':
        case 'ls':
        default:
          return { type: 'workflows', subAction: 'list' };
      }

    case 'routes':
    case 'route': {
      // Parse --json flag and --filter <pattern>
      let routeJson = false;
      let routeFilter: string | undefined;
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--json') routeJson = true;
        if (args[i] === '--filter') {
          routeFilter = args[i + 1];
        }
      }
      return { type: 'routes', json: routeJson, filter: routeFilter };
    }

    case 'console':
    case 'repl':
    case 'tinker':
      return { type: 'console', env: envName };

    case 'help':
    case '--help':
    case '-h':
    case undefined:
      return { type: 'help' };

    default: {
      // Check if it's an environment name shortcut (e.g., `cruz production` -> deploy production)
      const config = loadConfig(rootDir);
      const matchedCFEnv = config.cloudflareEnvironments?.find((e) => e.name === command);
      if (matchedCFEnv) {
        return { type: 'deploy', env: command, skipBuild, skipMigrate, yes };
      }

      return { type: 'help' };
    }
  }
}

// Main entry point
async function main() {
  const args = process.argv.slice(2);
  const command = parseArgs(args);

  // Foreground dev: bypass ink entirely so Vite output streams directly to the terminal
  if (command.type === 'dev' && command.subAction === 'start' && command.foreground) {
    runForegroundDev(rootDir);
    return;
  }

  // Console: bypass ink entirely — launches a Node.js REPL
  if (command.type === 'console') {
    await consoleCommand({ projectRoot: rootDir, env: command.env || 'development' });
    return;
  }

  // Routes: bypass ink entirely — writes directly to stdout
  if (command.type === 'routes') {
    await routesCommand({ projectRoot: rootDir, json: command.json, filter: command.filter });
    return;
  }

  const config = loadConfig(rootDir);

  const saveConfig = (updatedConfig: Config) => {
    saveConfigFn(rootDir, updatedConfig);
  };

  const { waitUntilExit } = render(
    <App
      command={command}
      config={config}
      saveConfig={saveConfig}
      rootDir={rootDir}
    />
  );

  await waitUntilExit();
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
