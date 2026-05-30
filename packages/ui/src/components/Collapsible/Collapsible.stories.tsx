import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Collapsible } from './Collapsible';

const meta = {
  title: 'Data Display/Collapsible',
  component: Collapsible,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'A standalone expand/collapse container with spring-animated height transitions. Like a single Accordion item but independent.',
      },
    },
  },
  argTypes: {
    disabled: { control: 'boolean' },
    defaultOpen: { control: 'boolean' },
  },
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    trigger: 'Show details',
    children: 'This is the collapsible content that can be toggled by clicking the trigger above. It animates smoothly with a spring easing curve.',
  },
  render: (args) => (
    <div className="max-w-lg">
      <Collapsible {...args} />
    </div>
  ),
};

export const DefaultOpen: Story = {
  args: {
    trigger: 'Project configuration',
    defaultOpen: true,
    children: 'This collapsible starts in the open state. Click the trigger to collapse it.',
  },
  render: (args) => (
    <div className="max-w-lg">
      <Collapsible {...args} />
    </div>
  ),
};

function ControlledExample() {
  const [open, setOpen] = useState(false);

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-white hover:opacity-90 transition-opacity"
        >
          {open ? 'Close externally' : 'Open externally'}
        </button>
        <span className="text-sm text-text-tertiary">
          State: {open ? 'open' : 'closed'}
        </span>
      </div>
      <Collapsible trigger="Controlled section" open={open} onOpenChange={setOpen}>
        This collapsible is controlled by external state. You can toggle it using the button above or by clicking the trigger directly.
      </Collapsible>
    </div>
  );
}

export const Controlled: Story = {
  args: {
    trigger: '',
    children: null as unknown as React.ReactNode,
  },
  render: () => <ControlledExample />,
};

export const Disabled: Story = {
  args: {
    trigger: 'Locked content (requires Pro)',
    disabled: true,
    children: 'This content is not accessible because the collapsible is disabled.',
  },
  render: (args) => (
    <div className="max-w-lg">
      <Collapsible {...args} />
    </div>
  ),
};

export const Nested: Story = {
  args: {
    trigger: '',
    children: null as unknown as React.ReactNode,
  },
  render: () => (
    <div className="max-w-lg">
      <Collapsible trigger="Outer section" className="rounded-2xl border border-surface-border p-4">
        <p className="mb-3">This is the outer collapsible content.</p>
        <Collapsible trigger="Inner section" className="rounded-xl border border-surface-border p-3 bg-surface-lighter/30">
          Nested collapsible content. Each instance manages its own open/close state independently.
        </Collapsible>
      </Collapsible>
    </div>
  ),
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  args: {
    trigger: '',
    children: null as unknown as React.ReactNode,
  },
  render: () => (
    <div className="p-4 space-y-3">
      <Collapsible trigger="Order summary" className="rounded-2xl border border-surface-border p-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Subtotal</span>
            <span className="text-text-strong">$49.00</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Tax</span>
            <span className="text-text-strong">$4.90</span>
          </div>
          <div className="border-t border-surface-border pt-2 flex justify-between text-sm font-medium">
            <span className="text-text-strong">Total</span>
            <span className="text-text-strong">$53.90</span>
          </div>
        </div>
      </Collapsible>
      <Collapsible trigger="Shipping details" className="rounded-2xl border border-surface-border p-4">
        <p className="text-sm text-text-secondary">
          Free standard shipping (5-7 business days). Express shipping available at checkout.
        </p>
      </Collapsible>
      <Collapsible trigger="Return policy" className="rounded-2xl border border-surface-border p-4" defaultOpen>
        <p className="text-sm text-text-secondary">
          30-day return policy. Items must be unused and in original packaging. Contact support to initiate a return.
        </p>
      </Collapsible>
    </div>
  ),
};
