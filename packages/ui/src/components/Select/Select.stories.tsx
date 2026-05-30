import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Select } from './Select';

const fruitOptions = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'dragonfruit', label: 'Dragonfruit' },
  { value: 'elderberry', label: 'Elderberry' },
  { value: 'fig', label: 'Fig' },
  { value: 'grape', label: 'Grape' },
  { value: 'honeydew', label: 'Honeydew' },
];

const groupedOptions = [
  { value: 'apple', label: 'Apple', group: 'Fruits' },
  { value: 'banana', label: 'Banana', group: 'Fruits' },
  { value: 'cherry', label: 'Cherry', group: 'Fruits' },
  { value: 'carrot', label: 'Carrot', group: 'Vegetables' },
  { value: 'broccoli', label: 'Broccoli', group: 'Vegetables' },
  { value: 'spinach', label: 'Spinach', group: 'Vegetables' },
  { value: 'salmon', label: 'Salmon', group: 'Proteins' },
  { value: 'chicken', label: 'Chicken', group: 'Proteins' },
  { value: 'tofu', label: 'Tofu', group: 'Proteins', disabled: true },
];

const meta = {
  title: 'Forms/Select',
  component: Select,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Custom select with search, groups, clear, keyboard navigation, and mobile bottom sheet.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    searchable: { control: 'boolean' },
    clearable: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Fruit',
    placeholder: 'Select a fruit...',
    options: fruitOptions,
  },
};

export const Searchable: Story = {
  args: {
    label: 'Fruit',
    placeholder: 'Search and select...',
    description: 'Type to filter the list of options',
    options: fruitOptions,
    searchable: true,
  },
};

export const Clearable: Story = {
  render: () => {
    const [value, setValue] = useState<string | undefined>('banana');
    return (
      <div className="max-w-xs">
        <Select
          label="Fruit"
          options={fruitOptions}
          value={value}
          onChange={setValue}
          clearable
          placeholder="Select a fruit..."
        />
        <p className="mt-3 text-xs text-text-tertiary">
          Current value: {value ?? '(none)'}
        </p>
      </div>
    );
  },
  args: {
    options: fruitOptions,
  },
};

export const WithGroups: Story = {
  args: {
    label: 'Food',
    placeholder: 'Pick an ingredient...',
    options: groupedOptions,
    searchable: true,
  },
};

export const WithError: Story = {
  args: {
    label: 'Category',
    placeholder: 'Select a category...',
    options: fruitOptions,
    error: 'This field is required',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Fruit',
    placeholder: 'Cannot select...',
    options: fruitOptions,
    disabled: true,
    defaultValue: 'apple',
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-4 max-w-xs">
      <Select size="sm" label="Small" placeholder="Small select" options={fruitOptions} />
      <Select size="md" label="Medium" placeholder="Medium select" options={fruitOptions} />
      <Select size="lg" label="Large" placeholder="Large select" options={fruitOptions} />
    </div>
  ),
  args: {
    options: fruitOptions,
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  render: () => (
    <div className="p-4 space-y-4">
      <Select
        label="Fruit"
        placeholder="Select a fruit..."
        options={fruitOptions}
        searchable
      />
      <Select
        label="Food Group"
        placeholder="Pick an ingredient..."
        options={groupedOptions}
        clearable
      />
    </div>
  ),
  args: {
    options: fruitOptions,
  },
};
