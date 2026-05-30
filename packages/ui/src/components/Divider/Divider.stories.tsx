import type { Meta, StoryObj } from '@storybook/react';
import { Divider } from './Divider';
import type { DividerVariant, DividerColor, DividerLabelPosition, DividerSpacing } from './Divider';

// --- Meta ---

const meta = {
  title: 'Layout/Divider',
  component: Divider,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Horizontal or vertical separator with optional text, icon, or button inset. Supports solid, dashed, and dotted variants with configurable label positioning and color.',
      },
    },
  },
  argTypes: {
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    variant: { control: 'select', options: ['solid', 'dashed', 'dotted'] },
    color: { control: 'select', options: ['default', 'primary', 'muted'] },
    labelPosition: { control: 'select', options: ['start', 'center', 'end'] },
    spacing: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
  args: {
    orientation: 'horizontal',
    variant: 'solid',
    color: 'default',
    spacing: 'md',
  },
} satisfies Meta<typeof Divider>;

export default meta;
type Story = StoryObj<typeof meta>;

// --- Helpers ---

const allVariants: DividerVariant[] = ['solid', 'dashed', 'dotted'];
const allColors: DividerColor[] = ['default', 'primary', 'muted'];
const allPositions: DividerLabelPosition[] = ['start', 'center', 'end'];
const allSpacings: DividerSpacing[] = ['sm', 'md', 'lg'];

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// --- Default ---

export const Default: Story = {};

// --- Variants ---

export const Variants: Story = {
  render: () => (
    <div className="rounded-xl border border-surface-border p-6 space-y-0">
      {allVariants.map((variant) => (
        <div key={variant}>
          <p className="text-xs font-medium text-text-secondary mb-1">{capitalize(variant)}</p>
          <Divider variant={variant} spacing="md" />
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Solid, dashed, and dotted variants displayed inside a card.',
      },
    },
  },
};

// --- WithLabel ---

export const WithLabel: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium text-text-secondary mb-2">Text label</p>
        <Divider label="OR" />
      </div>
      <div>
        <p className="text-xs font-medium text-text-secondary mb-2">Icon label</p>
        <Divider
          label={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          }
        />
      </div>
      <div>
        <p className="text-xs font-medium text-text-secondary mb-2">Button label</p>
        <Divider
          label={
            <button
              type="button"
              className="rounded-md bg-surface-lighter px-3 py-1 text-xs font-medium text-text-secondary ring-1 ring-surface-border hover:bg-surface-hover transition-colors"
            >
              Show more
            </button>
          }
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Divider with text ("OR"), icon, and button labels rendered in the center of the line.',
      },
    },
  },
};

// --- LabelPositions ---

export const LabelPositions: Story = {
  render: () => (
    <div className="space-y-6">
      {allPositions.map((position) => (
        <div key={position}>
          <p className="text-xs font-medium text-text-secondary mb-2">{capitalize(position)}</p>
          <Divider label="Section" labelPosition={position} />
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Label positioned at start, center, and end of the divider line.',
      },
    },
  },
};

// --- Vertical ---

export const Vertical: Story = {
  render: () => (
    <div className="flex items-center h-16">
      <span className="text-sm text-text">Item One</span>
      <Divider orientation="vertical" />
      <span className="text-sm text-text">Item Two</span>
      <Divider orientation="vertical" />
      <span className="text-sm text-text">Item Three</span>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Vertical divider stretching between flex items.',
      },
    },
  },
};

// --- Colors ---

export const Colors: Story = {
  render: () => (
    <div className="space-y-6">
      {allColors.map((color) => (
        <div key={color}>
          <p className="text-xs font-medium text-text-secondary mb-2">{capitalize(color)}</p>
          <Divider color={color} label={capitalize(color)} />
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Default, primary, and muted color variants.',
      },
    },
  },
};

// --- Spacing ---

export const Spacing: Story = {
  render: () => (
    <div className="rounded-xl border border-surface-border p-6">
      {allSpacings.map((sp) => (
        <div key={sp}>
          <p className="text-xs font-medium text-text-secondary">Spacing: {sp}</p>
          <Divider spacing={sp} />
          <p className="text-xs text-text-muted">Content after divider</p>
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Small, medium, and large vertical spacing on horizontal dividers.',
      },
    },
  },
};

// --- InContext ---

export const InContext: Story = {
  render: () => (
    <div className="flex gap-8">
      {/* Form context */}
      <div className="w-72 rounded-xl border border-surface-border p-6 space-y-4">
        <h3 className="text-sm font-semibold text-text">Account Details</h3>
        <div className="space-y-2">
          <label className="block text-xs font-medium text-text-secondary">Email</label>
          <div className="rounded-lg border border-surface-border px-3 py-2 text-sm text-text-muted bg-surface-lighter">
            user@example.com
          </div>
        </div>
        <Divider label="OR" spacing="sm" />
        <div className="space-y-2">
          <label className="block text-xs font-medium text-text-secondary">Phone</label>
          <div className="rounded-lg border border-surface-border px-3 py-2 text-sm text-text-muted bg-surface-lighter">
            +1 (555) 123-4567
          </div>
        </div>
      </div>

      {/* Sidebar context */}
      <div className="w-56 rounded-xl border border-surface-border p-4 space-y-1">
        <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider px-2 mb-1">Navigation</p>
        {['Dashboard', 'Projects', 'Tasks'].map((item) => (
          <div
            key={item}
            className="px-2 py-1.5 text-sm text-text rounded-lg hover:bg-surface-lighter cursor-pointer"
          >
            {item}
          </div>
        ))}
        <Divider spacing="sm" color="muted" />
        <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider px-2 mb-1">Settings</p>
        {['Account', 'Billing', 'Team'].map((item) => (
          <div
            key={item}
            className="px-2 py-1.5 text-sm text-text rounded-lg hover:bg-surface-lighter cursor-pointer"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Divider used between form sections and between navigation groups in a sidebar.',
      },
    },
  },
};

// --- Mobile ---

export const Mobile: Story = {
  render: () => (
    <div className="space-y-4 p-4">
      <Divider />
      <Divider variant="dashed" label="OR" />
      <Divider color="primary" label="Continue" labelPosition="center" />
      <div className="flex items-center h-10">
        <span className="text-sm text-text">Left</span>
        <Divider orientation="vertical" spacing="sm" />
        <span className="text-sm text-text">Right</span>
      </div>
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Divider variants at 375px mobile viewport width.',
      },
    },
  },
};
