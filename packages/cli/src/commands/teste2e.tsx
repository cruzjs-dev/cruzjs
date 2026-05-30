import React, { useState, useEffect } from 'react';
import { Box, useApp } from 'ink';
import { Header, Task, type TaskStatus } from '../components/index';
import { runStreamingCommand } from '../utils/shell';
import { resolve } from 'path';

type TestE2EProps = {
  rootDir: string;
  ui?: boolean;
  watch?: boolean;
  headed?: boolean;
};

export const TestE2E: React.FC<TestE2EProps> = ({ rootDir, ui, watch, headed }) => {
  const { exit } = useApp();
  const [status, setStatus] = useState<TaskStatus>('running');
  const [message, setMessage] = useState('Running E2E tests...');

  useEffect(() => {
    const run = async () => {
      const e2eDir = resolve(rootDir, 'tests/e2e');

      if (watch) {
        const code = await runStreamingCommand('./watch-results.sh', [], { cwd: e2eDir });
        setStatus(code === 0 ? 'success' : 'error');
      } else {
        const args = ['playwright', 'test'];

        if (ui) {
          args.push('--ui');
        } else if (headed) {
          args.push('--headed');
        }

        const code = await runStreamingCommand('npx', args, { cwd: e2eDir });

        if (code === 0) {
          setStatus('success');
          setMessage('All E2E tests passed!');
        } else {
          setStatus('error');
          setMessage('Some E2E tests failed');
        }
      }

      setTimeout(() => exit(), 100);
    };

    run();
  }, [rootDir, ui, watch, headed, exit]);

  const mode = ui ? '(UI)' : watch ? '(watch)' : headed ? '(headed)' : '';
  const label = `E2E tests ${mode}`.trim();

  return (
    <Box flexDirection="column">
      <Header title="Cruz E2E Tests" />
      <Task label={label} status={status} message={message} />
    </Box>
  );
};
