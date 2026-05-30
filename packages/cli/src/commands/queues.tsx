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
import { createQueue, listQueues, deleteQueue } from '../utils/wrangler';
import { resolveAppDir } from '../utils/shell';

type QueueAction = 'create' | 'list' | 'delete';

type QueuesProps = {
  config: Config;
  rootDir: string;
  action: QueueAction;
  name?: string;
};

export const Queues: React.FC<QueuesProps> = ({
  config: _config,
  rootDir,
  action,
  name,
}) => {
  const { exit } = useApp();
  const [status, setStatus] = useState<TaskStatus>('running');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [queues, setQueues] = useState<{ queue_id: string; queue_name: string }[]>([]);

  const wranglerDir = resolveAppDir(rootDir);

  useEffect(() => {
    const run = async () => {
      switch (action) {
        case 'create': {
          if (!name) {
            setError('Queue name is required. Usage: cruz queue create <name>');
            setStatus('error');
            setTimeout(() => exit(), 100);
            return;
          }

          setMessage(`Creating queue: ${name}`);
          const result = createQueue(name, wranglerDir);

          if (result.success) {
            setStatus('success');
            setMessage(`Created! Queue ID: ${result.queueId || 'see dashboard'}`);
          } else {
            if (result.error?.includes('already exists')) {
              setStatus('success');
              setMessage('Queue already exists');
            } else {
              setError(result.error || 'Failed to create queue');
              setStatus('error');
            }
          }
          break;
        }

        case 'list': {
          setMessage('Fetching queues...');
          const list = listQueues(wranglerDir);
          setQueues(list);
          setStatus('success');
          setMessage(`Found ${list.length} queue(s)`);
          break;
        }

        case 'delete': {
          if (!name) {
            setError('Queue name is required. Usage: cruz queue delete <name>');
            setStatus('error');
            setTimeout(() => exit(), 100);
            return;
          }

          setMessage(`Deleting queue: ${name}`);
          const result = deleteQueue(name, wranglerDir);

          if (result.success) {
            setStatus('success');
            setMessage(`Deleted queue: ${name}`);
          } else {
            setError(result.error || 'Failed to delete queue');
            setStatus('error');
          }
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
        return 'Create Queue';
      case 'list':
        return 'List Queues';
      case 'delete':
        return 'Delete Queue';
    }
  };

  return (
    <Box flexDirection="column">
      <Header title="Queues" subtitle={getTitle()} />

      {error ? (
        <ErrorMsg>{error}</ErrorMsg>
      ) : action === 'list' && status === 'success' ? (
        <Box flexDirection="column">
          <Success>Queues:</Success>
          {queues.length === 0 ? (
            <Info>No queues found. Create one with: cruz queue create &lt;name&gt;</Info>
          ) : (
            <Box flexDirection="column" marginTop={1}>
              {queues.map((q) => (
                <Box key={q.queue_id}>
                  <Text color="cyan">{q.queue_name}</Text>
                  <Text color="gray"> ({q.queue_id})</Text>
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

export default Queues;
