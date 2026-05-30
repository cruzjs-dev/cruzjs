import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { DatePicker } from './DatePicker';

const meta = {
  title: 'Inputs/DatePicker',
  component: DatePicker,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Date picker with calendar grid, month/year navigation, and optional min/max constraints. Desktop floating popover, mobile bottom sheet.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    clearable: { control: 'boolean' },
    firstDayOfWeek: { control: 'select', options: [0, 1] },
  },
  args: {
    size: 'md',
    placeholder: 'Select a date...',
  },
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Date',
    description: 'Choose a date for the event',
  },
};

export const WithMinMax: Story = {
  args: {
    label: 'Booking Date',
    description: 'Only dates within the next 30 days are available',
    defaultValue: new Date(),
    minDate: new Date(),
    maxDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  },
};

export const Clearable: Story = {
  args: {
    label: 'Due Date',
    description: 'Optional - click X to clear',
    defaultValue: new Date(2026, 5, 15),
    clearable: true,
  },
};

export const MondayFirst: Story = {
  args: {
    label: 'Start Date',
    description: 'Week starts on Monday',
    defaultValue: new Date(2026, 2, 10),
    firstDayOfWeek: 1,
  },
};

export const Controlled: Story = {
  render: () => {
    const [date, setDate] = useState<Date | null>(new Date(2026, 3, 20));
    return (
      <div className="space-y-4 max-w-sm">
        <DatePicker
          label="Controlled Date"
          value={date}
          onChange={setDate}
          clearable
        />
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-secondary font-mono">
            {date ? date.toISOString().split('T')[0] : 'null'}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="px-3 py-1.5 text-sm rounded-lg bg-surface-lighter border border-surface-border text-text-secondary hover:bg-surface-border transition-colors"
            onClick={() => setDate(new Date())}
          >
            Set to today
          </button>
          <button
            type="button"
            className="px-3 py-1.5 text-sm rounded-lg bg-surface-lighter border border-surface-border text-text-secondary hover:bg-surface-border transition-colors"
            onClick={() => setDate(null)}
          >
            Clear
          </button>
        </div>
      </div>
    );
  },
};

export const WithError: Story = {
  args: {
    label: 'Deadline',
    error: 'Date must be in the future',
    defaultValue: new Date(2024, 0, 1),
  },
};

export const Disabled: Story = {
  args: {
    label: 'Locked Date',
    defaultValue: new Date(2026, 6, 4),
    disabled: true,
    description: 'This date cannot be changed',
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-6 max-w-xs">
      <DatePicker size="sm" label="Small" defaultValue={new Date(2026, 0, 1)} />
      <DatePicker size="md" label="Medium" defaultValue={new Date(2026, 3, 15)} />
      <DatePicker size="lg" label="Large" defaultValue={new Date(2026, 11, 25)} />
    </div>
  ),
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  render: () => (
    <div className="p-4 space-y-6">
      <DatePicker
        label="Event Date"
        defaultValue={new Date(2026, 5, 15)}
        clearable
      />
      <DatePicker
        label="Reminder"
        placeholder="Set a reminder date"
        description="You will be notified on this date"
      />
    </div>
  ),
};
