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
import { createR2Bucket, listR2Buckets } from '../utils/wrangler';
import { resolveAppDir } from '../utils/shell';

type StorageAction = 'create' | 'list';

type StorageProps = {
  config: Config;
  rootDir: string;
  action: StorageAction;
  name?: string;
};

export const Storage: React.FC<StorageProps> = ({
  config,
  rootDir,
  action,
  name,
}) => {
  const { exit } = useApp();
  const [status, setStatus] = useState<TaskStatus>('running');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [buckets, setBuckets] = useState<{ name: string }[]>([]);

  const wranglerDir = resolveAppDir(rootDir);

  useEffect(() => {
    const run = async () => {
      switch (action) {
        case 'create': {
          if (!name) {
            setError('Bucket name is required. Usage: deploy storage create <name>');
            setStatus('error');
            setTimeout(() => exit(), 100);
            return;
          }

          setMessage(`Creating R2 bucket: ${name}`);
          const result = createR2Bucket(name, wranglerDir);

          if (result.success) {
            setStatus('success');
            setMessage('Bucket created successfully');
          } else {
            if (result.error?.includes('already exists')) {
              setStatus('success');
              setMessage('Bucket already exists');
            } else {
              setError(result.error || 'Failed to create bucket');
              setStatus('error');
            }
          }
          break;
        }

        case 'list': {
          setMessage('Fetching R2 buckets...');
          const list = listR2Buckets(wranglerDir);
          setBuckets(list);
          setStatus('success');
          setMessage(`Found ${list.length} bucket(s)`);
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
        return 'Create R2 Bucket';
      case 'list':
        return 'List R2 Buckets';
    }
  };

  return (
    <Box flexDirection="column">
      <Header title="Storage" subtitle={getTitle()} />

      {error ? (
        <ErrorMsg>{error}</ErrorMsg>
      ) : action === 'list' && status === 'success' ? (
        <Box flexDirection="column">
          <Success>R2 Buckets:</Success>
          {buckets.length === 0 ? (
            <Info>No buckets found. Create one with: deploy storage create &lt;name&gt;</Info>
          ) : (
            <Box flexDirection="column" marginTop={1}>
              {buckets.map((bucket) => (
                <Box key={bucket.name}>
                  <Text color="cyan">{bucket.name}</Text>
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

export default Storage;
