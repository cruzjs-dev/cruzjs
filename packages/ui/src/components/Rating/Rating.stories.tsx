import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Rating } from './Rating';

const meta = {
  title: 'Inputs/Rating',
  component: Rating,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Star rating input/display with hover preview, half-star support, keyboard navigation, and customizable icons.',
      },
    },
  },
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 5, step: 0.5 } },
    count: { control: { type: 'number', min: 1, max: 10 } },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    color: { control: 'select', options: ['warning', 'primary', 'danger'] },
    allowHalf: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    count: 5,
    size: 'md',
    color: 'warning',
  },
} satisfies Meta<typeof Rating>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const [val, setVal] = useState(3);
    return <Rating {...args} value={val} onChange={setVal} />;
  },
};

export const HalfStars: Story = {
  render: () => {
    const [val, setVal] = useState(2.5);
    return (
      <div className="space-y-4">
        <div>
          <p className="text-xs text-text-tertiary mb-2">Click the left/right half of a star</p>
          <Rating value={val} onChange={setVal} allowHalf />
        </div>
        <p className="text-sm text-text-secondary">
          Current value: <span className="font-medium tabular-nums">{val}</span>
        </p>
      </div>
    );
  },
};

export const ReadOnly: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs text-text-tertiary mb-2">Full stars</p>
        <Rating value={4} readOnly />
      </div>
      <div>
        <p className="text-xs text-text-tertiary mb-2">Half stars</p>
        <Rating value={3.5} readOnly allowHalf />
      </div>
      <div>
        <p className="text-xs text-text-tertiary mb-2">Low rating</p>
        <Rating value={1} readOnly />
      </div>
    </div>
  ),
};

export const CustomCount: Story = {
  render: () => {
    const [val, setVal] = useState(7);
    return (
      <div className="space-y-4">
        <div>
          <p className="text-xs text-text-tertiary mb-2">10 stars</p>
          <Rating value={val} onChange={setVal} count={10} />
        </div>
        <div>
          <p className="text-xs text-text-tertiary mb-2">3 stars</p>
          <Rating defaultValue={2} count={3} />
        </div>
      </div>
    );
  },
};

export const Colors: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs text-text-tertiary mb-2">Warning (default)</p>
        <Rating value={4} readOnly color="warning" />
      </div>
      <div>
        <p className="text-xs text-text-tertiary mb-2">Primary</p>
        <Rating value={4} readOnly color="primary" />
      </div>
      <div>
        <p className="text-xs text-text-tertiary mb-2">Danger</p>
        <Rating value={4} readOnly color="danger" />
      </div>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs text-text-tertiary mb-2">Small</p>
        <Rating value={3} readOnly size="sm" />
      </div>
      <div>
        <p className="text-xs text-text-tertiary mb-2">Medium (default)</p>
        <Rating value={3} readOnly size="md" />
      </div>
      <div>
        <p className="text-xs text-text-tertiary mb-2">Large</p>
        <Rating value={3} readOnly size="lg" />
      </div>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs text-text-tertiary mb-2">Disabled (value 3)</p>
        <Rating value={3} disabled />
      </div>
      <div>
        <p className="text-xs text-text-tertiary mb-2">Disabled with danger color</p>
        <Rating value={2} disabled color="danger" />
      </div>
    </div>
  ),
};

export const Controlled: Story = {
  render: () => {
    const [val, setVal] = useState(0);
    return (
      <div className="space-y-4">
        <Rating value={val} onChange={setVal} allowHalf />
        <div className="flex items-center gap-4">
          <p className="text-sm text-text-secondary">
            Value: <span className="font-medium tabular-nums">{val}</span>
          </p>
          <button
            onClick={() => setVal(0)}
            className="text-xs px-2 py-1 rounded bg-surface-lighter text-text-secondary hover:bg-surface-border transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    );
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  render: () => {
    const [val, setVal] = useState(3);
    return (
      <div className="p-4 space-y-6">
        <div>
          <p className="text-sm text-text-secondary mb-2">Tap to rate</p>
          <Rating value={val} onChange={setVal} size="lg" />
        </div>
        <div>
          <p className="text-sm text-text-secondary mb-2">Half-star rating</p>
          <Rating defaultValue={2.5} allowHalf size="lg" />
        </div>
        <div>
          <p className="text-sm text-text-secondary mb-2">Read-only display</p>
          <Rating value={4.5} readOnly allowHalf />
        </div>
      </div>
    );
  },
};
