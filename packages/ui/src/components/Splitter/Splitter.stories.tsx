import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Splitter } from './Splitter';

const PaneContent = ({ label, color }: { label: string; color: string }) => (
  <div
    className="h-full flex items-center justify-center text-sm font-medium"
    style={{
      backgroundColor: `color-mix(in srgb, var(--color-${color}) 8%, var(--color-surface))`,
      color: `var(--color-${color})`,
      minHeight: '200px',
    }}
  >
    {label}
  </div>
);

const meta = {
  title: 'Layout/Splitter',
  component: Splitter,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Resizable split panel layout with draggable divider, keyboard navigation, and optional collapse.',
      },
    },
  },
  argTypes: {
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    defaultSize: { control: { type: 'range', min: 0, max: 100 } },
    minSize: { control: { type: 'range', min: 0, max: 50 } },
    maxSize: { control: { type: 'range', min: 50, max: 100 } },
    collapsible: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    orientation: 'horizontal',
    defaultSize: 50,
    minSize: 10,
    maxSize: 90,
    collapsible: false,
    disabled: false,
  },
} satisfies Meta<typeof Splitter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div style={{ height: '300px', border: '1px solid var(--color-surface-border)', borderRadius: '8px', overflow: 'hidden' }}>
      <Splitter {...args}>
        <PaneContent label="Panel A" color="primary" />
        <PaneContent label="Panel B" color="success" />
      </Splitter>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div style={{ height: '400px', border: '1px solid var(--color-surface-border)', borderRadius: '8px', overflow: 'hidden' }}>
      <Splitter orientation="vertical" defaultSize={40}>
        <PaneContent label="Top Panel" color="primary" />
        <PaneContent label="Bottom Panel" color="info" />
      </Splitter>
    </div>
  ),
};

export const CustomSizes: Story = {
  render: () => {
    const [size, setSize] = useState(30);
    return (
      <div className="space-y-2">
        <p className="text-sm text-text-secondary">
          First pane: <span className="font-mono tabular-nums">{size}%</span>
        </p>
        <div style={{ height: '300px', border: '1px solid var(--color-surface-border)', borderRadius: '8px', overflow: 'hidden' }}>
          <Splitter defaultSize={30} minSize={20} maxSize={80} onResize={setSize}>
            <PaneContent label="Sidebar (20-80%)" color="primary" />
            <PaneContent label="Content" color="success" />
          </Splitter>
        </div>
      </div>
    );
  },
};

export const Collapsible: Story = {
  render: () => (
    <div className="space-y-2">
      <p className="text-xs text-text-tertiary">Double-click the divider to collapse/expand the first pane</p>
      <div style={{ height: '300px', border: '1px solid var(--color-surface-border)', borderRadius: '8px', overflow: 'hidden' }}>
        <Splitter collapsible defaultSize={30}>
          <PaneContent label="Collapsible Sidebar" color="primary" />
          <PaneContent label="Main Content" color="success" />
        </Splitter>
      </div>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div style={{ height: '300px', border: '1px solid var(--color-surface-border)', borderRadius: '8px', overflow: 'hidden' }}>
      <Splitter disabled defaultSize={40}>
        <PaneContent label="Fixed Panel" color="primary" />
        <PaneContent label="Fixed Panel" color="success" />
      </Splitter>
    </div>
  ),
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  render: () => (
    <div className="p-4">
      <div className="space-y-4">
        <div style={{ height: '200px', border: '1px solid var(--color-surface-border)', borderRadius: '8px', overflow: 'hidden' }}>
          <Splitter orientation="vertical" defaultSize={50}>
            <PaneContent label="Top" color="primary" />
            <PaneContent label="Bottom" color="info" />
          </Splitter>
        </div>
        <div style={{ height: '200px', border: '1px solid var(--color-surface-border)', borderRadius: '8px', overflow: 'hidden' }}>
          <Splitter defaultSize={40}>
            <PaneContent label="Left" color="primary" />
            <PaneContent label="Right" color="success" />
          </Splitter>
        </div>
      </div>
    </div>
  ),
};
