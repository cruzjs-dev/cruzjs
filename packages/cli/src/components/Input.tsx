import React, { useState } from 'react';
import { Text, Box } from 'ink';
import TextInput from 'ink-text-input';

type InputProps = {
  label: string;
  placeholder?: string;
  defaultValue?: string;
  onSubmit: (value: string) => void;
  validate?: (value: string) => string | null;
  mask?: boolean;
};

export const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  defaultValue = '',
  onSubmit,
  validate,
  mask,
}) => {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (val: string) => {
    if (validate) {
      const validationError = validate(val);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    setError(null);
    onSubmit(val);
  };

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="cyan">? </Text>
        <Text bold>{label}: </Text>
        <TextInput
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          placeholder={placeholder}
          mask={mask ? '*' : undefined}
        />
      </Box>
      {error && (
        <Box marginLeft={2}>
          <Text color="red">✗ {error}</Text>
        </Box>
      )}
    </Box>
  );
};

type ConfirmProps = {
  label: string;
  defaultValue?: boolean;
  onConfirm: (value: boolean) => void;
};

export const Confirm: React.FC<ConfirmProps> = ({
  label,
  defaultValue = true,
  onConfirm,
}) => {
  const [value, setValue] = useState(defaultValue ? 'Y' : 'n');

  const handleSubmit = (val: string) => {
    const normalized = val.toLowerCase().trim();
    if (normalized === '' || normalized === 'y' || normalized === 'yes') {
      onConfirm(true);
    } else {
      onConfirm(false);
    }
  };

  const hint = defaultValue ? '[Y/n]' : '[y/N]';

  return (
    <Box>
      <Text color="cyan">? </Text>
      <Text bold>{label} </Text>
      <Text color="gray">{hint} </Text>
      <TextInput
        value={value}
        onChange={setValue}
        onSubmit={handleSubmit}
      />
    </Box>
  );
};

