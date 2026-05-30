import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import {
  Config,
  CloudflareEnvironment,
} from '../config/index';
import {
  Header,
  StepHeader,
  Task,
  Input,
  Info,
  Success,
  ErrorMsg,
  type TaskStatus,
} from '../components/index';
import { runWrangler } from '../utils/wrangler';
import { resolveAppDir } from '../utils/shell';

type DestroyProps = {
  config: Config;
  saveConfig: (config: Config) => void;
  rootDir: string;
  envName?: string;
  autoConfirm?: boolean;
  force?: boolean;
};

type Step = 'preview' | 'confirm' | 'destroying' | 'done' | 'error';

type DestroyTask = {
  id: string;
  label: string;
  status: TaskStatus;
  message?: string;
};

export const Destroy: React.FC<DestroyProps> = ({
  config,
  saveConfig,
  rootDir,
  envName,
  autoConfirm = false,
  force = false,
}) => {
  const { exit } = useApp();

  const [step, setStep] = useState<Step>('preview');
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<DestroyTask[]>([]);
  const [targetEnv, setTargetEnv] = useState<CloudflareEnvironment | null>(null);

  const wranglerDir = resolveAppDir(rootDir);

  // Find environment on mount
  useEffect(() => {
    if (!envName) {
      setError('Environment name is required.\n\nUsage: cruz-deploy destroy <environment>');
      setStep('error');
      return;
    }

    const env = config.cloudflareEnvironments?.find((e) => e.name === envName);
    if (!env) {
      const available = (config.cloudflareEnvironments || []).map((e) => e.name).join(', ');
      setError(
        `Environment "${envName}" not found.` +
          (available ? `\n\nAvailable environments: ${available}` : '')
      );
      setStep('error');
      return;
    }

    if (env.name === 'production' && !force) {
      setError(
        'Cannot destroy production environment without --force flag.\n\n' +
          'Usage: cruz-deploy destroy production --force'
      );
      setStep('error');
      return;
    }

    setTargetEnv(env);

    if (autoConfirm) {
      setStep('destroying');
    }
  }, [envName]);

  const updateTask = (id: string, updates: Partial<DestroyTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const runDestroy = async () => {
    if (!targetEnv) {
      setError('No environment selected');
      setStep('error');
      return;
    }

    const taskList: DestroyTask[] = [];

    if (targetEnv.d1) {
      taskList.push({ id: 'd1', label: `Delete D1 database: ${targetEnv.d1.name}`, status: 'pending' });
    }
    if (targetEnv.kv) {
      taskList.push({ id: 'kv', label: `Delete KV namespace: ${targetEnv.kv.name}`, status: 'pending' });
    }
    if (targetEnv.r2) {
      taskList.push({ id: 'r2', label: `Delete R2 bucket: ${targetEnv.r2.name}`, status: 'pending' });
    }
    if (targetEnv.queues) {
      for (const queue of targetEnv.queues) {
        taskList.push({ id: `queue-${queue.name}`, label: `Delete queue: ${queue.name}`, status: 'pending' });
      }
    }
    taskList.push({ id: 'config', label: 'Remove from configuration', status: 'pending' });

    setTasks(taskList);

    try {
      // Delete D1 database
      if (targetEnv.d1) {
        updateTask('d1', { status: 'running', message: 'Deleting...' });
        const result = runWrangler(['d1', 'delete', targetEnv.d1.name, '-y'], wranglerDir);
        if (!result.success) {
          updateTask('d1', { status: 'error', message: result.error });
          // Continue with other deletions - resource may already be gone
        } else {
          updateTask('d1', { status: 'success', message: 'Deleted' });
        }
      }

      // Delete KV namespace
      if (targetEnv.kv) {
        updateTask('kv', { status: 'running', message: 'Deleting...' });
        const result = runWrangler(
          ['kv', 'namespace', 'delete', '--namespace-id', targetEnv.kv.namespaceId],
          wranglerDir
        );
        if (!result.success) {
          updateTask('kv', { status: 'error', message: result.error });
        } else {
          updateTask('kv', { status: 'success', message: 'Deleted' });
        }
      }

      // Delete R2 bucket
      if (targetEnv.r2) {
        updateTask('r2', { status: 'running', message: 'Deleting...' });
        const result = runWrangler(['r2', 'bucket', 'delete', targetEnv.r2.name], wranglerDir);
        if (!result.success) {
          updateTask('r2', { status: 'error', message: result.error });
        } else {
          updateTask('r2', { status: 'success', message: 'Deleted' });
        }
      }

      // Delete queues
      if (targetEnv.queues) {
        for (const queue of targetEnv.queues) {
          const taskId = `queue-${queue.name}`;
          updateTask(taskId, { status: 'running', message: 'Deleting...' });
          const result = runWrangler(['queues', 'delete', queue.name], wranglerDir);
          if (!result.success) {
            updateTask(taskId, { status: 'error', message: result.error });
          } else {
            updateTask(taskId, { status: 'success', message: 'Deleted' });
          }
        }
      }

      // Remove from config
      updateTask('config', { status: 'running', message: 'Updating config...' });
      const updatedConfig: Config = {
        ...config,
        cloudflareEnvironments: config.cloudflareEnvironments.filter(
          (e) => e.name !== targetEnv.name
        ),
      };
      saveConfig(updatedConfig);
      updateTask('config', { status: 'success', message: 'Removed from .deploy-cloudflare.json' });

      setStep('done');
    } catch (err) {
      setError((err as Error).message);
      setStep('error');
    }
  };

  useEffect(() => {
    if (step === 'destroying') {
      runDestroy();
    }
  }, [step]);

  if (step === 'error') {
    return (
      <Box flexDirection="column">
        <Header title="Destroy Environment" subtitle="Failed" />
        <ErrorMsg>{error}</ErrorMsg>
      </Box>
    );
  }

  if (step === 'done') {
    return (
      <Box flexDirection="column">
        <Header title="Destroy Environment" subtitle="Complete" />
        <Box flexDirection="column" marginY={1}>
          {tasks.map((task) => (
            <Task
              key={task.id}
              label={task.label}
              status={task.status}
              message={task.message}
            />
          ))}
        </Box>
        <Success>Environment "{targetEnv?.name}" has been destroyed.</Success>
      </Box>
    );
  }

  if (step === 'destroying') {
    return (
      <Box flexDirection="column">
        <Header title="Destroy Environment" subtitle={targetEnv?.name || 'Destroying'} />
        <Box flexDirection="column" marginY={1}>
          {tasks.map((task) => (
            <Task
              key={task.id}
              label={task.label}
              status={task.status}
              message={task.message}
            />
          ))}
        </Box>
      </Box>
    );
  }

  if (step === 'preview' && targetEnv) {
    return (
      <Box flexDirection="column">
        <Header title="Destroy Environment" subtitle={targetEnv.name} />
        <StepHeader step={1} title="Review Resources to Delete" />

        <Box flexDirection="column" marginLeft={2} marginY={1}>
          <Text bold color="red">The following resources will be permanently deleted:</Text>
          <Box marginTop={1} flexDirection="column">
            {targetEnv.d1 && (
              <Box>
                <Text color="red">  x </Text>
                <Text>D1 Database: {targetEnv.d1.name}</Text>
                <Text color="gray"> ({targetEnv.d1.databaseId})</Text>
              </Box>
            )}
            {targetEnv.kv && (
              <Box>
                <Text color="red">  x </Text>
                <Text>KV Namespace: {targetEnv.kv.name}</Text>
                <Text color="gray"> ({targetEnv.kv.namespaceId})</Text>
              </Box>
            )}
            {targetEnv.r2 && (
              <Box>
                <Text color="red">  x </Text>
                <Text>R2 Bucket: {targetEnv.r2.name}</Text>
              </Box>
            )}
            {targetEnv.queues?.map((q) => (
              <Box key={q.name}>
                <Text color="red">  x </Text>
                <Text>Queue: {q.name}</Text>
                <Text color="gray"> ({q.queueId})</Text>
              </Box>
            ))}
            {!targetEnv.d1 && !targetEnv.kv && !targetEnv.r2 && (!targetEnv.queues || targetEnv.queues.length === 0) && (
              <Info>No cloud resources to delete (config entry only).</Info>
            )}
          </Box>
        </Box>

        <StepHeader step={2} title="Confirm Destruction" />
        <Box marginLeft={2}>
          <Input
            label={`Type "${targetEnv.name}" to confirm`}
            placeholder={targetEnv.name}
            onSubmit={(value: string) => {
              if (value === targetEnv.name) {
                setStep('destroying');
              } else {
                setError(`Confirmation failed. Expected "${targetEnv.name}", got "${value}".`);
                setStep('error');
              }
            }}
          />
        </Box>
      </Box>
    );
  }

  return null;
};

export default Destroy;
