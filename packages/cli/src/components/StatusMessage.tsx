import React from 'react';
import { Text, Box } from 'ink';

export type StatusType = 'info' | 'success' | 'warning' | 'error' | 'pending';

type StatusMessageProps = {
  type: StatusType;
  children: React.ReactNode;
};

const STATUS_ICONS: Record<StatusType, string> = {
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  error: '✗',
  pending: '○',
};

const STATUS_COLORS: Record<StatusType, string> = {
  info: 'blue',
  success: 'green',
  warning: 'yellow',
  error: 'red',
  pending: 'gray',
};

export const StatusMessage: React.FC<StatusMessageProps> = ({ type, children }) => {
  return (
    <Box>
      <Text color={STATUS_COLORS[type]}>{STATUS_ICONS[type]} </Text>
      <Text>{children}</Text>
    </Box>
  );
};

export const Info: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <StatusMessage type="info">{children}</StatusMessage>
);

export const Success: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <StatusMessage type="success">{children}</StatusMessage>
);

export const Warning: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <StatusMessage type="warning">{children}</StatusMessage>
);

export const ErrorMsg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <StatusMessage type="error">{children}</StatusMessage>
);

export const Pending: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <StatusMessage type="pending">{children}</StatusMessage>
);

