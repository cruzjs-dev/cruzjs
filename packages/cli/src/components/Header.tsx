import React from 'react';
import { Text, Box } from 'ink';

type HeaderProps = {
  title: string;
  subtitle?: string;
};

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const width = Math.max(60, title.length + 10);
  const border = '═'.repeat(width);
  
  return (
    <Box flexDirection="column" marginY={1}>
      <Text color="magenta" bold>╔{border}╗</Text>
      <Text color="magenta" bold>
        ║{' '.repeat(Math.floor((width - title.length) / 2))}
        <Text color="white" bold>{title}</Text>
        {' '.repeat(Math.ceil((width - title.length) / 2))}║
      </Text>
      {subtitle && (
        <Text color="magenta" bold>
          ║{' '.repeat(Math.floor((width - subtitle.length) / 2))}
          <Text color="gray" dimColor>{subtitle}</Text>
          {' '.repeat(Math.ceil((width - subtitle.length) / 2))}║
        </Text>
      )}
      <Text color="magenta" bold>╚{border}╝</Text>
    </Box>
  );
};

type StepHeaderProps = {
  step: number;
  totalSteps?: number;
  title: string;
};

export const StepHeader: React.FC<StepHeaderProps> = ({ step, totalSteps, title }) => {
  const stepText = totalSteps ? `Step ${step}/${totalSteps}` : `Step ${step}`;
  
  return (
    <Box marginY={1}>
      <Text color="cyan" bold>{stepText}: </Text>
      <Text bold>{title}</Text>
    </Box>
  );
};

