import React, { useState, useEffect } from 'react';
import { Box, useApp } from 'ink';
import { Header, Task, type TaskStatus } from '../components/index';
import { runStreamingCommand, resolveAppDir } from '../utils/shell';

type TypecheckProps = {
  rootDir: string;
  tests?: boolean;
};

export const Typecheck: React.FC<TypecheckProps> = ({ rootDir, tests }) => {
  const { exit } = useApp();
  const [status, setStatus] = useState<TaskStatus>('running');
  const [message, setMessage] = useState('Type checking...');

  useEffect(() => {
    const run = async () => {
      const args = tests
        ? ['tsc', '--noEmit', '--project', 'tsconfig.test.json']
        : ['tsc', '--noEmit'];

      const code = await runStreamingCommand('npx', args, { cwd: resolveAppDir(rootDir) });

      if (code === 0) {
        setStatus('success');
        setMessage('No type errors found!');
      } else {
        setStatus('error');
        setMessage('Type errors found');
      }

      setTimeout(() => exit(), 100);
    };

    run();
  }, [rootDir, tests, exit]);

  const label = tests ? 'Type check (with tests)' : 'Type check';

  return (
    <Box flexDirection="column">
      <Header title="Cruz Typecheck" />
      <Task label={label} status={status} message={message} />
    </Box>
  );
};
