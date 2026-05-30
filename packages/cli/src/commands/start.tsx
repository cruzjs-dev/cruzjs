import React, { useState, useEffect } from 'react';
import { Box, useApp } from 'ink';
import { Header, Task, type TaskStatus } from '../components/index';
import { runStreamingCommand } from '../utils/shell';

type StartProps = {
  rootDir: string;
};

export const Start: React.FC<StartProps> = ({ rootDir }) => {
  const { exit } = useApp();
  const [status, setStatus] = useState<TaskStatus>('running');

  useEffect(() => {
    const run = async () => {
      const code = await runStreamingCommand('npx', ['react-router-serve', './dist/server/index.js'], { cwd: rootDir });
      setStatus(code === 0 ? 'success' : 'error');
      exit();
    };

    run();
  }, [rootDir, exit]);

  return (
    <Box flexDirection="column">
      <Header title="Cruz Start" subtitle="Starting production server..." />
      <Task label="react-router-serve" status={status} />
    </Box>
  );
};
