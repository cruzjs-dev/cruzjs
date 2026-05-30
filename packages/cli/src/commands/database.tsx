import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import {
  Header,
  Task,
  Info,
  Success,
  ErrorMsg,
  type TaskStatus,
} from '../components/index';
import { Config } from '../config/index';
import {
  createD1Database,
  listD1Databases,
  applyD1Migrations,
  runWranglerInteractive,
} from '../utils/wrangler';
import { resolveAppDir } from '../utils/shell';

type DatabaseAction = 'create' | 'list' | 'migrate' | 'info';

type DatabaseProps = {
  config: Config;
  rootDir: string;
  action: DatabaseAction;
  envName?: string;
  name?: string;
  remote?: boolean;
};

export const Database: React.FC<DatabaseProps> = ({
  config,
  rootDir,
  action,
  envName,
  name,
  remote = false,
}) => {
  const { exit } = useApp();
  const [status, setStatus] = useState<TaskStatus>('running');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [databases, setDatabases] = useState<{ name: string; uuid: string }[]>([]);

  const wranglerDir = resolveAppDir(rootDir);

  useEffect(() => {
    const run = async () => {
      switch (action) {
        case 'create': {
          if (!name) {
            setError('Database name is required. Usage: deploy database create <name>');
            setStatus('error');
            setTimeout(() => exit(), 100);
            return;
          }

          setMessage(`Creating D1 database: ${name}`);
          const result = createD1Database(name, wranglerDir);

          if (result.success) {
            setStatus('success');
            setMessage(`Created! Database ID: ${result.databaseId}`);
          } else {
            setError(result.error || 'Failed to create database');
            setStatus('error');
          }
          break;
        }

        case 'list': {
          setMessage('Fetching D1 databases...');
          const dbs = listD1Databases(wranglerDir);
          setDatabases(dbs);
          setStatus('success');
          setMessage(`Found ${dbs.length} database(s)`);
          break;
        }

        case 'migrate': {
          const dbName = name || getEnvDatabaseName(config, envName);
          if (!dbName) {
            setError('Database name is required. Use --name or specify environment with -e');
            setStatus('error');
            setTimeout(() => exit(), 100);
            return;
          }

          const target = remote ? 'remote' : 'local';
          setMessage(`Applying migrations to ${dbName} (${target})...`);

          const result = applyD1Migrations(dbName, wranglerDir, remote);

          if (result.success) {
            setStatus('success');
            setMessage('Migrations applied successfully');
          } else {
            // Check if it's just "no migrations to apply"
            if (result.error?.includes('No migrations')) {
              setStatus('success');
              setMessage('No pending migrations');
            } else {
              setError(result.error || 'Failed to apply migrations');
              setStatus('error');
            }
          }
          break;
        }

        case 'info': {
          const dbName = name || getEnvDatabaseName(config, envName);
          if (!dbName) {
            setError('Database name is required');
            setStatus('error');
            setTimeout(() => exit(), 100);
            return;
          }

          setMessage(`Fetching info for ${dbName}...`);
          // Use wrangler d1 info command
          runWranglerInteractive(['d1', 'info', dbName], wranglerDir);
          setStatus('success');
          break;
        }
      }

      setTimeout(() => exit(), 100);
    };

    run();
  }, [action, name, remote, envName, wranglerDir, config, exit]);

  const getTitle = () => {
    switch (action) {
      case 'create':
        return 'Create D1 Database';
      case 'list':
        return 'List D1 Databases';
      case 'migrate':
        return `Apply Migrations (${remote ? 'remote' : 'local'})`;
      case 'info':
        return 'Database Info';
    }
  };

  return (
    <Box flexDirection="column">
      <Header title="Database" subtitle={getTitle()} />

      {error ? (
        <ErrorMsg>{error}</ErrorMsg>
      ) : action === 'list' && status === 'success' ? (
        <Box flexDirection="column">
          <Success>D1 Databases:</Success>
          {databases.length === 0 ? (
            <Info>No databases found. Create one with: deploy database create &lt;name&gt;</Info>
          ) : (
            <Box flexDirection="column" marginTop={1}>
              {databases.map((db) => (
                <Box key={db.uuid}>
                  <Text color="cyan">{db.name}</Text>
                  <Text color="gray"> ({db.uuid})</Text>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      ) : (
        <Task label={getTitle()} status={status} message={message} />
      )}
    </Box>
  );
};

function getEnvDatabaseName(config: Config, envName?: string): string | null {
  if (!envName) return null;
  const env = config.cloudflareEnvironments?.find((e) => e.name === envName);
  return env?.d1?.name || null;
}

export default Database;
