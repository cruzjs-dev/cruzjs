import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { ExamplePreview } from './ExamplePreview';

// ─── Sample preview components ──────────────────────────────────────────────

const SampleButton: React.FC = () => (
  <button
    type="button"
    className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
  >
    Click me
  </button>
);

const SampleCard: React.FC = () => (
  <div className="max-w-sm p-4 rounded-lg border border-surface-border bg-surface">
    <h3 className="text-sm font-semibold text-text mb-1">Card Title</h3>
    <p className="text-xs text-text-secondary">
      This is a sample card component with title and description text.
    </p>
    <div className="mt-3 flex gap-2">
      <button
        type="button"
        className="px-3 py-1.5 text-xs font-medium rounded bg-primary text-white"
      >
        Primary
      </button>
      <button
        type="button"
        className="px-3 py-1.5 text-xs font-medium rounded border border-surface-border text-text"
      >
        Secondary
      </button>
    </div>
  </div>
);

// ─── Sample code ────────────────────────────────────────────────────────────

const buttonCode = `<button
  type="button"
  className="px-4 py-2 bg-primary text-white rounded-lg font-medium"
>
  Click me
</button>`;

const cardCode = `<div className="max-w-sm p-4 rounded-lg border border-surface-border bg-surface">
  <h3 className="text-sm font-semibold text-text mb-1">Card Title</h3>
  <p className="text-xs text-text-secondary">
    This is a sample card component with title and description text.
  </p>
  <div className="mt-3 flex gap-2">
    <button className="px-3 py-1.5 text-xs font-medium rounded bg-primary text-white">
      Primary
    </button>
    <button className="px-3 py-1.5 text-xs font-medium rounded border border-surface-border text-text">
      Secondary
    </button>
  </div>
</div>`;

// ─── Meta ───────────────────────────────────────────────────────────────────

const meta = {
  title: 'Documentation/ExamplePreview',
  component: ExamplePreview,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Component example block for documentation. Shows a live preview of a component with a toggleable source code panel, optional resizable preview width, and dark/light background toggle.',
      },
    },
  },
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
    code: { control: 'text' },
    language: { control: 'text' },
    defaultShowCode: { control: 'boolean' },
    resizable: { control: 'boolean' },
  },
} satisfies Meta<typeof ExamplePreview>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Default ────────────────────────────────────────────────────────────────

export const Default: Story = {
  args: {
    code: buttonCode,
    language: 'tsx',
    children: <SampleButton />,
  },
  parameters: {
    docs: {
      description: {
        story: 'Basic example preview with a button component and toggleable source code.',
      },
    },
  },
};

// ─── WithCode ───────────────────────────────────────────────────────────────

export const WithCode: Story = {
  args: {
    code: cardCode,
    language: 'tsx',
    title: 'Card Component',
    description: 'A versatile card with title, description, and action buttons.',
    children: <SampleCard />,
  },
  parameters: {
    docs: {
      description: {
        story: 'Example preview with title, description, and a more complex component.',
      },
    },
  },
};

// ─── WithTitle ──────────────────────────────────────────────────────────────

export const WithTitle: Story = {
  args: {
    title: 'Button Variants',
    description: 'Primary button with hover and focus states.',
    code: buttonCode,
    language: 'tsx',
    children: (
      <div className="flex gap-3">
        <SampleButton />
        <button
          type="button"
          className="px-4 py-2 border border-surface-border text-text rounded-lg font-medium"
        >
          Secondary
        </button>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Example preview with title and description in the header bar.',
      },
    },
  },
};

// ─── DefaultShowCode ────────────────────────────────────────────────────────

export const DefaultShowCode: Story = {
  args: {
    code: buttonCode,
    language: 'tsx',
    title: 'Code Visible by Default',
    defaultShowCode: true,
    children: <SampleButton />,
  },
  parameters: {
    docs: {
      description: {
        story: 'Source code panel is visible on initial render.',
      },
    },
  },
};

// ─── Resizable ──────────────────────────────────────────────────────────────

export const Resizable: Story = {
  args: {
    code: cardCode,
    language: 'tsx',
    title: 'Resizable Preview',
    description: 'Drag the right edge to resize the preview width.',
    resizable: true,
    children: <SampleCard />,
  },
  parameters: {
    docs: {
      description: {
        story: 'Preview area is resizable via a drag handle on the right edge.',
      },
    },
  },
};

// ─── Mobile ─────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  args: {
    code: buttonCode,
    language: 'tsx',
    title: 'Mobile View',
    children: <SampleButton />,
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    docs: {
      description: {
        story: 'Example preview in a mobile viewport.',
      },
    },
  },
};
