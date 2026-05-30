import React, { useState, useEffect } from 'react';
import { Box, useApp } from 'ink';
import { Header, Task, type TaskStatus } from '../components/index';
import { runStreamingCommand } from '../utils/shell';

type WorkerProps = {
  rootDir: string;
  action: 'dev' | 'start';
};

export const Worker: React.FC<WorkerProps> = ({ rootDir, action }) => {
  const { exit } = useApp();
  const [status, setStatus] = useState<TaskStatus>('running');

  useEffect(() => {
    const run = async () => {
      const args = action === 'dev'
        ? ['tsx', 'watch', 'src/workers/index.ts']
        : ['tsx', 'src/workers/index.ts'];

      const code = await runStreamingCommand('npx', args, { cwd: rootDir });
      setStatus(code === 0 ? 'success' : 'error');
      exit();
    };

    run();
  }, [rootDir, action, exit]);

  const label = action === 'dev' ? 'Worker (dev mode)' : 'Worker';

  return (
    <Box flexDirection="column">
      <Header title="Cruz Worker" />
      <Task label={label} status={status} />
    </Box>
  );
};
