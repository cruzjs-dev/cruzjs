import React from 'react';
import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';

export type TaskStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped';

type TaskProps = {
  label: string;
  status: TaskStatus;
  message?: string;
  indent?: number;
};

const STATUS_ICONS: Record<TaskStatus, React.ReactNode> = {
  pending: <Text color="gray">○</Text>,
  running: <Text color="cyan"><Spinner type="dots" /></Text>,
  success: <Text color="green">✓</Text>,
  error: <Text color="red">✗</Text>,
  skipped: <Text color="yellow">⊘</Text>,
};

export const Task: React.FC<TaskProps> = ({ 
  label, 
  status, 
  message,
  indent = 0,
}) => {
  const padding = '  '.repeat(indent);
  
  return (
    <Box>
      <Text>{padding}</Text>
      {STATUS_ICONS[status]}
      <Text> {label}</Text>
      {message && <Text color="gray"> - {message}</Text>}
    </Box>
  );
};

type TaskListProps = {
  tasks: Array<{
    id: string;
    label: string;
    status: TaskStatus;
    message?: string;
  }>;
};

export const TaskList: React.FC<TaskListProps> = ({ tasks }) => {
  return (
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
  );
};

