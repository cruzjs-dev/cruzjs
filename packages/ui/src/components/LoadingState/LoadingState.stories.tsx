import type { Meta, StoryObj } from '@storybook/react';
import { LoadingState } from './LoadingState';

// ─── Meta ────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Feedback/LoadingState',
  component: LoadingState,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Full-page or inline loading placeholder with spinner, skeleton, or dots variants. Provides accessible loading feedback with optional text and description.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl'] },
    variant: { control: 'select', options: ['spinner', 'skeleton', 'dots'] },
    text: { control: 'text' },
    description: { control: 'text' },
    fullPage: { control: 'boolean' },
  },
  args: {
    size: 'xl',
    variant: 'spinner',
  },
} satisfies Meta<typeof LoadingState>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Default ────────────────────────────────────────────────────────────────

export const Default: Story = {};

// ─── WithText ───────────────────────────────────────────────────────────────

export const WithText: Story = {
  render: () => (
    <LoadingState
      text="Loading your data..."
      description="This may take a few seconds."
    />
  ),
  parameters: {
    docs: {
      description: { story: 'Spinner with text and description below.' },
    },
  },
};

// ─── FullPage ───────────────────────────────────────────────────────────────

export const FullPage: Story = {
  render: () => (
    <LoadingState
      fullPage
      text="Loading dashboard..."
      description="Fetching your latest data."
    />
  ),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: { story: 'Full-page variant centered vertically in the viewport.' },
    },
  },
};

// ─── Dots ───────────────────────────────────────────────────────────────────

export const Dots: Story = {
  render: () => (
    <LoadingState variant="dots" text="Processing..." />
  ),
  parameters: {
    docs: {
      description: { story: 'Dots variant with 3 bouncing dots animation.' },
    },
  },
};

// ─── Skeleton ───────────────────────────────────────────────────────────────

export const Skeleton: Story = {
  render: () => (
    <LoadingState variant="skeleton" text="Loading content..." />
  ),
  parameters: {
    docs: {
      description: { story: 'Skeleton variant with 3 pulsing lines.' },
    },
  },
};

// ─── Sizes ──────────────────────────────────────────────────────────────────

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
        <div key={size} className="rounded-xl border border-surface-border bg-surface p-4">
          <LoadingState
            size={size}
            text={`Size: ${size}`}
            description={`This is the ${size} size variant.`}
          />
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: { story: 'All four size variants with proportional spinner, text, and description.' },
    },
  },
};
