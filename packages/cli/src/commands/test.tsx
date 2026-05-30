import React, { useState, useEffect } from 'react';
import { Box, useApp } from 'ink';
import { Header, Task, type TaskStatus } from '../components/index';
import { runStreamingCommand } from '../utils/shell';

type TestProps = {
  rootDir: string;
  ui?: boolean;
  watch?: boolean;
  coverage?: boolean;
  integration?: boolean;
};

export const Test: React.FC<TestProps> = ({ rootDir, ui, watch, coverage, integration }) => {
  const { exit } = useApp();
  const [status, setStatus] = useState<TaskStatus>('running');
  const [message, setMessage] = useState('Running tests...');

  useEffect(() => {
    const run = async () => {
      const args = ['vitest'];

      if (ui) {
        args.push('--ui');
      } else if (watch) {
        args.push('--watch');
      } else if (coverage) {
        args.push('--coverage');
      } else {
        args.push('run');
      }

      if (integration) {
        args.push('--testPathPattern', '.*\\.integration\\.test\\.ts$');
      }

      const code = await runStreamingCommand('npx', args, { cwd: rootDir });

      if (code === 0) {
        setStatus('success');
        setMessage('All tests passed!');
      } else {
        setStatus('error');
        setMessage('Some tests failed');
      }

      setTimeout(() => exit(), 100);
    };

    run();
  }, [rootDir, ui, watch, coverage, integration, exit]);

  const mode = ui ? '(UI)' : watch ? '(watch)' : coverage ? '(coverage)' : integration ? '(integration)' : '';
  const label = `${integration ? 'Integration' : 'Unit'} tests ${mode}`.trim();

  return (
    <Box flexDirection="column">
      <Header title="Cruz Test" />
      <Task label={label} status={status} message={message} />
    </Box>
  );
};
