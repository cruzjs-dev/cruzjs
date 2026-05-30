import React, { useState } from 'react';
import { Text, Box, useInput } from 'ink';

type SelectItem<T> = {
  label: string;
  value: T;
  description?: string;
};

type SelectProps<T> = {
  items: SelectItem<T>[];
  onSelect: (item: SelectItem<T>) => void;
  label?: string;
};

export function Select<T>({ items, onSelect, label }: SelectProps<T>): React.ReactElement {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
    } else if (key.downArrow) {
      setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
    } else if (key.return) {
      onSelect(items[selectedIndex]);
    }
  });

  return (
    <Box flexDirection="column">
      {label && (
        <Box marginBottom={1}>
          <Text color="cyan">? </Text>
          <Text bold>{label}</Text>
        </Box>
      )}
      {items.map((item, index) => {
        const isSelected = index === selectedIndex;
        return (
          <Box key={index}>
            <Text color={isSelected ? 'green' : 'white'}>
              {isSelected ? '❯ ' : '  '}
            </Text>
            <Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
              {item.label}
            </Text>
            {item.description && (
              <Text color="gray"> - {item.description}</Text>
            )}
          </Box>
        );
      })}
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          Use ↑↓ to navigate, Enter to select
        </Text>
      </Box>
    </Box>
  );
}

