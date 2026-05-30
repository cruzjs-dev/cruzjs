import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import { Header, Task, ErrorMsg, type TaskStatus } from '../components/index';
import { runStreamingCommand, envFileExists, resolveAppDir } from '../utils/shell';
import { resolve } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { config as loadEnv } from 'dotenv';

/** Read the first D1 database_name from a wrangler TOML file. */
function getD1DatabaseName(dir: string, remote: boolean): string | null {
  const configFile = remote ? 'wrangler.toml' : 'wrangler.dev.toml';
  const configPath = resolve(dir, configFile);
  if (!existsSync(configPath)) return null;
  const content = readFileSync(configPath, 'utf-8');
  const match = content.match(/\[\[d1_databases\]\][^\[]*database_name\s*=\s*"([^"]+)"/s);
  return match ? match[1] : null;
}

type LocalDatabaseProps = {
  rootDir: string;
  action: 'generate' | 'migrate' | 'push' | 'studio' | 'seed' | 'hard-reset' | 'query' | 'rollback' | 'generate:migration' | 'generate:rollback' | 'backup' | 'restore';
  env?: string;
  remote?: boolean;
  sql?: string;
  fresh?: boolean;
  steps?: number;
  name?: string;
  output?: string;
  file?: string;
};

const ACTION_LABELS: Record<string, string> = {
  generate: 'Generate migrations',
  migrate: 'Apply D1 migrations',
  push: 'Push schema changes',
  studio: 'Open Drizzle Studio',
  seed: 'Seed database',
  'hard-reset': 'Hard reset database',
  query: 'Execute SQL query',
  rollback: 'Rollback migrations',
  'generate:migration': 'Create named migration',
  'generate:rollback': 'Generate rollback skeleton',
  backup: 'Backup database',
  restore: 'Restore database',
};

export const LocalDatabase: React.FC<LocalDatabaseProps> = ({ rootDir, action, env, remote = false, sql, fresh = false, steps = 1, name, output, file }) => {
  const { exit } = useApp();
  const [status, setStatus] = useState<TaskStatus>('running');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [targetInfo, setTargetInfo] = useState<string>('');

  useEffect(() => {
    const run = async () => {
      const needsEnv = ['migrate', 'push', 'studio', 'seed', 'hard-reset'].includes(action);

      if (needsEnv && env) {
        const envFile = `.env.${env}`;
        if (!envFileExists(rootDir, env)) {
          setError(`Environment file ${envFile} not found`);
          setStatus('error');
          setTimeout(() => exit(), 100);
          return;
        }
        loadEnv({ path: resolve(rootDir, envFile) });
      } else if (needsEnv) {
        loadEnv({ path: resolve(rootDir, '.env') });
      }

      if (needsEnv) {
        setTargetInfo(remote ? 'Remote D1' : 'Local D1');
      }

      let code: number;
      const appDir = resolveAppDir(rootDir);

      switch (action) {
        case 'generate':
          code = await runStreamingCommand('npx', ['drizzle-kit', 'generate'], { cwd: appDir });
          if (code === 0) {
            setMessage('Migrations generated. Tip: create a corresponding _rollback.sql file for each migration to support `cruz db rollback`.');
          }
          break;

        case 'migrate': {
          const dbName = getD1DatabaseName(appDir, remote);
          if (!dbName) {
            const configFile = remote ? 'wrangler.toml' : 'wrangler.dev.toml';
            setError(`Could not find [[d1_databases]] database_name in ${configFile}`);
            setStatus('error');
            setTimeout(() => exit(), 100);
            return;
          }
          const wranglerConfig = remote ? 'wrangler.toml' : 'wrangler.dev.toml';
          const wranglerConfigPath = resolve(appDir, wranglerConfig);
          const migrateArgs = ['wrangler', 'd1', 'migrations', 'apply', dbName];
          if (existsSync(wranglerConfigPath)) {
            migrateArgs.push('--config', wranglerConfig);
          }
          if (remote) {
            migrateArgs.push('--remote');
          } else {
            migrateArgs.push('--local');
          }
          code = await runStreamingCommand('npx', migrateArgs, { cwd: appDir });
          break;
        }

        case 'push':
          setMessage('For D1, use "migrate" to apply schema changes');
          code = 0;
          break;

        case 'studio':
          code = await runStreamingCommand('npx', ['drizzle-kit', 'studio'], { cwd: appDir });
          break;

        case 'seed': {
          // Support both legacy single seed file and new seeders directory
          const seedersDir = resolve(appDir, 'src/database/seeders');
          const legacySeedFile = resolve(appDir, 'src/database/seed.ts');

          if (existsSync(seedersDir)) {
            // New seeder framework: glob seeders directory
            if (fresh) {
              setMessage('--fresh: Hard resetting database before seeding...');
              const { execSync } = await import('child_process');
              try {
                execSync(`rm -rf ${appDir}/.wrangler/state/v3/d1`, { stdio: 'inherit' });
              } catch (err) {
                setError(`Hard reset failed: ${(err as Error).message}`);
                setStatus('error');
                setTimeout(() => exit(), 100);
                return;
              }
              // Re-apply migrations
              const dbName = getD1DatabaseName(appDir, false);
              if (dbName) {
                const devConfigPath = resolve(appDir, 'wrangler.dev.toml');
                const devConfigArgs = existsSync(devConfigPath) ? ['--config', 'wrangler.dev.toml'] : [];
                const migrateCode = await runStreamingCommand('npx', ['wrangler', 'd1', 'migrations', 'apply', dbName, ...devConfigArgs, '--local'], { cwd: appDir });
                if (migrateCode !== 0) {
                  setError('Migration after hard reset failed');
                  setStatus('error');
                  setTimeout(() => exit(), 100);
                  return;
                }
              }
            }

            // Run seeders via a generated runner script
            const runnerScript = `
import { resolve } from 'path';
import { runSeeders } from '@cruzjs/core/database/seeding';
import { DrizzleService, DrizzleCruzDatabase } from '@cruzjs/core';
import * as schema from './src/database/schema';

async function main() {
  DrizzleService.setSchema(schema);
  await DrizzleService.initFromContext();
  const db = DrizzleService.getDb();
  await runSeeders(db, resolve('${seedersDir.replace(/\\/g, '/')}'));
}

main().catch((err) => { console.error(err); process.exit(1); });
`;
            const { writeFileSync, unlinkSync } = await import('fs');
            const tmpRunner = resolve(appDir, '.cruz-seed-runner.ts');
            writeFileSync(tmpRunner, runnerScript);
            try {
              code = await runStreamingCommand('npx', ['tsx', tmpRunner], { cwd: appDir });
            } finally {
              try { unlinkSync(tmpRunner); } catch { /* ignore */ }
            }
          } else if (existsSync(legacySeedFile)) {
            // Legacy: single seed.ts file
            if (fresh) {
              setMessage('--fresh: Hard resetting database before seeding...');
              const { execSync } = await import('child_process');
              try {
                execSync(`rm -rf ${appDir}/.wrangler/state/v3/d1`, { stdio: 'inherit' });
              } catch (err) {
                setError(`Hard reset failed: ${(err as Error).message}`);
                setStatus('error');
                setTimeout(() => exit(), 100);
                return;
              }
              const dbName = getD1DatabaseName(appDir, false);
              if (dbName) {
                const devConfigPath2 = resolve(appDir, 'wrangler.dev.toml');
                const devConfigArgs2 = existsSync(devConfigPath2) ? ['--config', 'wrangler.dev.toml'] : [];
                await runStreamingCommand('npx', ['wrangler', 'd1', 'migrations', 'apply', dbName, ...devConfigArgs2, '--local'], { cwd: appDir });
              }
            }
            code = await runStreamingCommand('npx', ['tsx', legacySeedFile], { cwd: appDir });
          } else {
            setError('No seeders found. Create src/database/seeders/*.ts or src/database/seed.ts');
            setStatus('error');
            setTimeout(() => exit(), 100);
            return;
          }
          break;
        }

        case 'hard-reset': {
          if (remote) {
            setError('Hard reset is only available for local development. Use Cloudflare Dashboard to manage remote D1.');
            setStatus('error');
            setTimeout(() => exit(), 100);
            return;
          }

          setMessage('Deleting local D1 database...');

          const { execSync } = await import('child_process');
          try {
            execSync(`rm -rf ${appDir}/.wrangler/state/v3/d1`, { stdio: 'inherit' });
            setMessage('Local D1 database deleted. Run "cruz db migrate" to recreate.');
            code = 0;
          } catch (err) {
            setError(`Hard reset failed: ${(err as Error).message}`);
            setStatus('error');
            setTimeout(() => exit(), 100);
            return;
          }
          break;
        }

        case 'query': {
          if (!sql) {
            setError('SQL query is required. Usage: cruz db query "SELECT * FROM ..."');
            setStatus('error');
            setTimeout(() => exit(), 100);
            return;
          }
          const dbName = getD1DatabaseName(appDir, remote);
          if (!dbName) {
            const configFile = remote ? 'wrangler.toml' : 'wrangler.dev.toml';
            setError(`Could not find [[d1_databases]] database_name in ${configFile}`);
            setStatus('error');
            setTimeout(() => exit(), 100);
            return;
          }
          const queryArgs = ['wrangler', 'd1', 'execute', dbName, `--command=${sql}`];
          if (remote) {
            queryArgs.push('--remote');
          } else {
            queryArgs.push('--local');
          }
          code = await runStreamingCommand('npx', queryArgs, { cwd: appDir });
          break;
        }

        case 'rollback': {
          if (remote) {
            setError('Rollback is only available for local development. Manage remote D1 via the Cloudflare Dashboard.');
            setStatus('error');
            setTimeout(() => exit(), 100);
            return;
          }

          const rollbackDbName = getD1DatabaseName(appDir, false);
          if (!rollbackDbName) {
            setError('Could not find [[d1_databases]] database_name in wrangler.dev.toml');
            setStatus('error');
            setTimeout(() => exit(), 100);
            return;
          }

          // Discover migration files
          const { readdirSync } = await import('fs');
          const migrationsDir = resolve(appDir, 'src/database/migrations/sqlite');
          if (!existsSync(migrationsDir)) {
            setError(`Migrations directory not found: ${migrationsDir}`);
            setStatus('error');
            setTimeout(() => exit(), 100);
            return;
          }

          const migrationFiles = readdirSync(migrationsDir)
            .filter((f: string) => f.endsWith('.sql') && !f.includes('_rollback'))
            .sort();

          if (migrationFiles.length === 0) {
            setError('No migration files found to roll back.');
            setStatus('error');
            setTimeout(() => exit(), 100);
            return;
          }

          const stepsToRollback = Math.min(steps, migrationFiles.length);
          const migrationsToRollback = migrationFiles.slice(-stepsToRollback).reverse();

          let allSuccess = true;
          for (const migration of migrationsToRollback) {
            const baseName = migration.replace('.sql', '');
            const rollbackFile = resolve(migrationsDir, `${baseName}_rollback.sql`);

            if (!existsSync(rollbackFile)) {
              setError(
                `Rollback file not found: ${baseName}_rollback.sql\n` +
                `Create it at: ${rollbackFile}\n` +
                `The rollback file should contain SQL statements to undo the migration in ${migration}.`
              );
              setStatus('error');
              allSuccess = false;
              break;
            }

            const rollbackSql = readFileSync(rollbackFile, 'utf-8').trim();
            if (!rollbackSql) {
              setError(`Rollback file is empty: ${baseName}_rollback.sql`);
              setStatus('error');
              allSuccess = false;
              break;
            }

            setMessage(`Rolling back: ${baseName}...`);
            const rollbackArgs = ['wrangler', 'd1', 'execute', rollbackDbName, `--command=${rollbackSql}`, '--local'];
            const rollbackCode = await runStreamingCommand('npx', rollbackArgs, { cwd: appDir });

            if (rollbackCode !== 0) {
              setError(`Failed to apply rollback for ${baseName}`);
              setStatus('error');
              allSuccess = false;
              break;
            }
          }

          if (allSuccess) {
            code = 0;
            setMessage(`Successfully rolled back ${stepsToRollback} migration(s)`);
          } else {
            code = 1;
          }
          break;
        }

        case 'generate:migration': {
          if (!name) {
            setError('Migration name is required. Usage: cruz db generate:migration <name>');
            setStatus('error');
            setTimeout(() => exit(), 100);
            return;
          }

          const appDir = resolveAppDir(rootDir);
          const migrationsDir = resolve(appDir, 'src/database/migrations/sqlite');
          mkdirSync(migrationsDir, { recursive: true });

          // Find next index based on existing migration files
          const existingFiles = existsSync(migrationsDir)
            ? (await import('fs')).readdirSync(migrationsDir).filter((f: string) => /^\d{4}_.*\.sql$/.test(f))
            : [];
          const maxIdx = existingFiles.reduce((max: number, f: string) => {
            const idx = parseInt(f.slice(0, 4), 10);
            return isNaN(idx) ? max : Math.max(max, idx);
          }, -1);
          const nextIdx = String(maxIdx + 1).padStart(4, '0');
          const safeName = name.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
          const filename = `${nextIdx}_${safeName}.sql`;
          const filepath = resolve(migrationsDir, filename);
          const isoNow = new Date().toISOString();

          const template = `-- Migration: ${name}\n-- Created: ${isoNow}\n-- Type: data (manual)\n\n-- Write your SQL here.\n-- DDL changes should still go through \`cruz db generate\`.\n`;
          writeFileSync(filepath, template, 'utf-8');

          setMessage(`Created: src/database/migrations/sqlite/${filename}\nRun \`cruz db migrate\` after editing.`);
          code = 0;
          break;
        }

        case 'generate:rollback': {
          if (!name) {
            setError('Migration name is required. Usage: cruz db generate:rollback <name>');
            setStatus('error');
            setTimeout(() => exit(), 100);
            return;
          }

          const appDir4 = resolveAppDir(rootDir);
          const migrationsDir4 = resolve(appDir4, 'src/database/migrations/sqlite');

          // Find migration file by name or path
          let migrationPath: string | null = null;
          if (existsSync(name)) {
            migrationPath = name;
          } else {
            // Search migrations directory
            const { readdirSync } = await import('fs');
            if (existsSync(migrationsDir4)) {
              const files = readdirSync(migrationsDir4).filter((f: string) => f.endsWith('.sql') && !f.includes('_rollback'));
              const found = files.find((f: string) => f.includes(name));
              if (found) migrationPath = resolve(migrationsDir4, found);
            }
          }

          if (!migrationPath || !existsSync(migrationPath)) {
            setError(`Migration not found: ${name}`);
            setStatus('error');
            setTimeout(() => exit(), 100);
            return;
          }

          const { readFileSync: readFS } = await import('fs');
          const { writeFileSync: writeFS } = await import('fs');
          const { generateRollback } = await import('../utils/rollback-generator');

          const forwardSql = readFS(migrationPath, 'utf-8');
          const baseName = migrationPath.split('/').pop()?.replace('.sql', '') ?? name;
          const { sql, reversedCount, todoCount } = generateRollback(forwardSql, baseName);

          const timestamp2 = new Date().toISOString().replace(/[:.]/g, '-');
          const rollbackFilename = `${timestamp2}_rollback_${baseName}.sql`;
          const rollbackPath = resolve(migrationsDir4, rollbackFilename);
          writeFS(rollbackPath, sql, 'utf-8');

          setMessage(`Rollback skeleton: src/database/migrations/sqlite/${rollbackFilename}\nAuto-reversed: ${reversedCount} | Needs manual work: ${todoCount}`);
          code = 0;
          break;
        }

        case 'backup': {
          const appDir2 = resolveAppDir(rootDir);
          const dbName2 = getD1DatabaseName(appDir2, remote);
          if (!dbName2) {
            const cfgFile = remote ? 'wrangler.toml' : 'wrangler.dev.toml';
            setError(`Could not find [[d1_databases]] database_name in ${cfgFile}`);
            setStatus('error');
            setTimeout(() => exit(), 100);
            return;
          }

          const backupsDir = resolve(rootDir, 'backups');
          mkdirSync(backupsDir, { recursive: true });
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const outputFile = output ?? resolve(backupsDir, `cruz-backup-${timestamp}.sql`);

          const backupArgs = ['wrangler', 'd1', 'export', dbName2, '--output', outputFile];
          const wranglerConfig = remote ? 'wrangler.toml' : 'wrangler.dev.toml';
          if (existsSync(resolve(appDir2, wranglerConfig))) {
            backupArgs.push('--config', wranglerConfig);
          }
          if (remote) backupArgs.push('--remote');
          else backupArgs.push('--local');

          code = await runStreamingCommand('npx', backupArgs, { cwd: appDir2 });
          if (code === 0) {
            setMessage(`Backup saved: ${outputFile}`);
          }
          break;
        }

        case 'restore': {
          if (!file) {
            setError('Restore file is required. Usage: cruz db restore <file>');
            setStatus('error');
            setTimeout(() => exit(), 100);
            return;
          }

          const appDir3 = resolveAppDir(rootDir);
          const dbName3 = getD1DatabaseName(appDir3, remote);
          if (!dbName3) {
            const cfgFile = remote ? 'wrangler.toml' : 'wrangler.dev.toml';
            setError(`Could not find [[d1_databases]] database_name in ${cfgFile}`);
            setStatus('error');
            setTimeout(() => exit(), 100);
            return;
          }

          const restoreArgs = ['wrangler', 'd1', 'execute', dbName3, '--file', file];
          const wranglerConfig3 = remote ? 'wrangler.toml' : 'wrangler.dev.toml';
          if (existsSync(resolve(appDir3, wranglerConfig3))) {
            restoreArgs.push('--config', wranglerConfig3);
          }
          if (remote) restoreArgs.push('--remote');
          else restoreArgs.push('--local');

          code = await runStreamingCommand('npx', restoreArgs, { cwd: appDir3 });
          if (code === 0) {
            setMessage(`Restored from: ${file}`);
          }
          break;
        }

        default:
          code = 1;
      }

      if (code === 0) {
        setStatus('success');
        setMessage(message || 'Complete!');
      } else {
        setStatus('error');
        setMessage(`Failed with code ${code}`);
      }

      setTimeout(() => exit(), 100);
    };

    run();
  }, [rootDir, action, env, remote, fresh, steps, exit]);

  const label = ACTION_LABELS[action] || action;
  const envLabel = env ? ` (${env})` : '';

  return (
    <Box flexDirection="column">
      <Header title="Cruz Database (D1)" />
      {targetInfo && (
        <Text color="cyan">→ Target: {targetInfo}</Text>
      )}
      <Text> </Text>
      {error ? (
        <ErrorMsg>{error}</ErrorMsg>
      ) : (
        <Task label={`${label}${envLabel}`} status={status} message={message} />
      )}
    </Box>
  );
};
