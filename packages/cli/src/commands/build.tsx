import React, { useState, useEffect } from 'react';
import { Box, useApp } from 'ink';
import { Header, Task, type TaskStatus } from '../components/index';
import { runStreamingCommand, resolveAppDir } from '../utils/shell';
import { bundlePagesWorker } from '../utils/wrangler';

type BuildProps = {
  rootDir: string;
};

export const Build: React.FC<BuildProps> = ({ rootDir }) => {
  const { exit } = useApp();
  const [status, setStatus] = useState<TaskStatus>('running');
  const [message, setMessage] = useState('Building...');

  useEffect(() => {
    const run = async () => {
      const appDir = resolveAppDir(rootDir);
      const code = await runStreamingCommand('npx', ['react-router', 'build'], { cwd: appDir });

      if (code !== 0) {
        setStatus('error');
        setMessage(`Build failed with code ${code}`);
        setTimeout(() => exit(), 100);
        return;
      }

      const workerResult = bundlePagesWorker(appDir);
      if (!workerResult.success) {
        setStatus('error');
        setMessage(`Worker bundle failed: ${workerResult.error}`);
      } else {
        setStatus('success');
        setMessage('Build complete!');
      }

      setTimeout(() => exit(), 100);
    };

    run();
  }, [rootDir, exit]);

  return (
    <Box flexDirection="column">
      <Header title="Cruz Build" />
      <Task label="Production build" status={status} message={message} />
    </Box>
  );
};
