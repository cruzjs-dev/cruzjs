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
import { createKVNamespace, listKVNamespaces } from '../utils/wrangler';
import { resolveAppDir } from '../utils/shell';

type KVAction = 'create' | 'list';

type KVProps = {
  config: Config;
  rootDir: string;
  action: KVAction;
  name?: string;
};

export const KV: React.FC<KVProps> = ({
  config: _config,
  rootDir,
  action,
  name,
}) => {
  const { exit } = useApp();
  const [status, setStatus] = useState<TaskStatus>('running');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [namespaces, setNamespaces] = useState<{ id: string; title: string }[]>([]);

  const wranglerDir = resolveAppDir(rootDir);

  useEffect(() => {
    const run = async () => {
      switch (action) {
        case 'create': {
          if (!name) {
            setError('Namespace name is required. Usage: deploy kv create <name>');
            setStatus('error');
            setTimeout(() => exit(), 100);
            return;
          }

          setMessage(`Creating KV namespace: ${name}`);
          const result = createKVNamespace(name, wranglerDir);

          if (result.success) {
            setStatus('success');
            setMessage(`Created! Namespace ID: ${result.namespaceId}`);
          } else {
            if (result.error?.includes('already exists')) {
              setStatus('success');
              setMessage('Namespace already exists');
            } else {
              setError(result.error || 'Failed to create namespace');
              setStatus('error');
            }
          }
          break;
        }

        case 'list': {
          setMessage('Fetching KV namespaces...');
          const list = listKVNamespaces(wranglerDir);
          setNamespaces(list);
          setStatus('success');
          setMessage(`Found ${list.length} namespace(s)`);
          break;
        }
      }

      setTimeout(() => exit(), 100);
    };

    run();
  }, [action, name, wranglerDir, exit]);

  const getTitle = () => {
    switch (action) {
      case 'create':
        return 'Create KV Namespace';
      case 'list':
        return 'List KV Namespaces';
    }
  };

  return (
    <Box flexDirection="column">
      <Header title="KV" subtitle={getTitle()} />

      {error ? (
        <ErrorMsg>{error}</ErrorMsg>
      ) : action === 'list' && status === 'success' ? (
        <Box flexDirection="column">
          <Success>KV Namespaces:</Success>
          {namespaces.length === 0 ? (
            <Info>No namespaces found. Create one with: deploy kv create &lt;name&gt;</Info>
          ) : (
            <Box flexDirection="column" marginTop={1}>
              {namespaces.map((ns) => (
                <Box key={ns.id}>
                  <Text color="cyan">{ns.title}</Text>
                  <Text color="gray"> ({ns.id})</Text>
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

export default KV;
