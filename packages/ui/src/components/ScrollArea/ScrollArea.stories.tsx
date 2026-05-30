import type { Meta, StoryObj } from '@storybook/react';
import { ScrollArea } from './ScrollArea';

// --- Meta ---

const meta = {
  title: 'UI/ScrollArea',
  component: ScrollArea,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Custom-styled scrollable container with thin, auto-hiding scrollbars. Uses native scrolling with CSS-styled scrollbar for both Webkit and Firefox.',
      },
    },
  },
  argTypes: {
    orientation: { control: 'select', options: ['vertical', 'horizontal', 'both'] },
    maxHeight: { control: 'text' },
  },
  args: {
    orientation: 'vertical',
    maxHeight: '200px',
  },
} satisfies Meta<typeof ScrollArea>;

export default meta;
type Story = StoryObj<typeof meta>;

// --- Helpers ---

const paragraphs = Array.from({ length: 10 }, (_, i) => (
  <p key={i} className="text-sm text-text-secondary py-2 border-b border-surface-border">
    Item {i + 1} - Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
  </p>
));

const horizontalItems = Array.from({ length: 20 }, (_, i) => (
  <div
    key={i}
    className="shrink-0 w-32 h-20 rounded-lg bg-surface-lighter flex items-center justify-center text-sm text-text-secondary border border-surface-border"
  >
    Card {i + 1}
  </div>
));

// --- Default ---

export const Default: Story = {
  render: () => (
    <ScrollArea maxHeight="200px">
      {paragraphs}
    </ScrollArea>
  ),
};

// --- Horizontal ---

export const Horizontal: Story = {
  render: () => (
    <ScrollArea orientation="horizontal" style={{ maxWidth: '400px' }}>
      <div className="flex gap-3 p-2">
        {horizontalItems}
      </div>
    </ScrollArea>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Horizontal scroll area with a row of cards.',
      },
    },
  },
};

// --- Both ---

export const Both: Story = {
  render: () => (
    <ScrollArea orientation="both" maxHeight="200px" style={{ maxWidth: '400px' }}>
      <div className="w-[800px]">
        {paragraphs}
        <div className="flex gap-3 p-2">
          {horizontalItems}
        </div>
      </div>
    </ScrollArea>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Scrollable in both directions with wide and tall content.',
      },
    },
  },
};

// --- Custom Height ---

export const CustomHeight: Story = {
  render: () => (
    <div className="flex gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-xs text-text-secondary">150px</span>
        <ScrollArea maxHeight={150} className="w-64 border border-surface-border rounded-lg p-2">
          {paragraphs}
        </ScrollArea>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-text-secondary">300px</span>
        <ScrollArea maxHeight={300} className="w-64 border border-surface-border rounded-lg p-2">
          {paragraphs}
        </ScrollArea>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Two scroll areas with different maxHeight values.',
      },
    },
  },
};

// --- With Long Content ---

export const WithLongContent: Story = {
  render: () => (
    <ScrollArea maxHeight="300px" className="border border-surface-border rounded-xl p-4">
      {Array.from({ length: 50 }, (_, i) => (
        <div key={i} className="flex items-center justify-between py-2 border-b border-surface-border last:border-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-subtle flex items-center justify-center text-xs font-semibold text-primary">
              {i + 1}
            </div>
            <span className="text-sm text-text">Row item {i + 1}</span>
          </div>
          <span className="text-xs text-text-muted">Details</span>
        </div>
      ))}
    </ScrollArea>
  ),
  parameters: {
    docs: {
      description: {
        story: '50 row items demonstrating smooth scrolling with thin styled scrollbar.',
      },
    },
  },
};

// --- Mobile ---

export const Mobile: Story = {
  render: () => (
    <ScrollArea maxHeight="200px" className="p-3">
      {paragraphs}
    </ScrollArea>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Scroll area rendered at 375px mobile viewport width.',
      },
    },
  },
};
