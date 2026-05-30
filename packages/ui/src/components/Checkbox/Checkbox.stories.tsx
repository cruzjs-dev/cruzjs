import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Checkbox } from './Checkbox';
import type { CheckboxSize, CheckboxColor } from './Checkbox';

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'UI/Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Custom styled checkbox with label, description, error, indeterminate state, and color variants. Built on a hidden native input for full accessibility.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    color: { control: 'select', options: ['primary', 'success', 'danger'] },
    indeterminate: { control: 'boolean' },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
    description: { control: 'text' },
    error: { control: 'text' },
  },
  args: {
    size: 'md',
    color: 'primary',
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const allSizes: CheckboxSize[] = ['sm', 'md', 'lg'];
const allColors: CheckboxColor[] = ['primary', 'success', 'danger'];
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ─── Default ──────────────────────────────────────────────────────────────────

export const Default: Story = {};

// ─── WithLabel ────────────────────────────────────────────────────────────────

export const WithLabel: Story = {
  args: {
    label: 'Accept terms and conditions',
  },
  parameters: {
    docs: {
      description: {
        story: 'Checkbox with a text label displayed to the right.',
      },
    },
  },
};

// ─── WithDescription ──────────────────────────────────────────────────────────

export const WithDescription: Story = {
  args: {
    label: 'Email notifications',
    description: 'Receive email updates about your account activity and security alerts.',
  },
  parameters: {
    docs: {
      description: {
        story: 'Checkbox with label and a description line below the label in smaller, muted text.',
      },
    },
  },
};

// ─── WithError ────────────────────────────────────────────────────────────────

export const WithError: Story = {
  args: {
    label: 'I agree to the terms',
    error: 'You must accept the terms to continue.',
  },
  parameters: {
    docs: {
      description: {
        story: 'Checkbox displaying an error message below. Sets aria-invalid for screen readers.',
      },
    },
  },
};

// ─── Sizes ────────────────────────────────────────────────────────────────────

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {allSizes.map((size) => (
        <Checkbox key={size} size={size} label={`Size ${size}`} defaultChecked />
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Small (16px), medium (20px), and large (24px) checkbox sizes with proportional label text.',
      },
    },
  },
};

// ─── Indeterminate ────────────────────────────────────────────────────────────

export const Indeterminate: Story = {
  render: function IndeterminateStory() {
    const [items, setItems] = useState([true, false, true]);
    const allChecked = items.every(Boolean);
    const someChecked = items.some(Boolean) && !allChecked;

    return (
      <div className="flex flex-col gap-3">
        <Checkbox
          label="Select all"
          checked={allChecked}
          indeterminate={someChecked}
          onChange={() => setItems(allChecked ? [false, false, false] : [true, true, true])}
        />
        <div className="ml-6 flex flex-col gap-2">
          {['Emails', 'Push notifications', 'SMS'].map((name, i) => (
            <Checkbox
              key={name}
              label={name}
              size="sm"
              checked={items[i]}
              onChange={() => {
                const next = [...items];
                next[i] = !next[i];
                setItems(next);
              }}
            />
          ))}
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Parent checkbox uses the indeterminate state when some (but not all) children are checked. Displays a horizontal dash instead of a checkmark.',
      },
    },
  },
};

// ─── Colors ───────────────────────────────────────────────────────────────────

export const Colors: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {allColors.map((color) => (
        <Checkbox key={color} color={color} label={capitalize(color)} defaultChecked />
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Primary, success, and danger color variants when checked.',
      },
    },
  },
};

// ─── Disabled ─────────────────────────────────────────────────────────────────

export const Disabled: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Checkbox label="Disabled unchecked" disabled />
      <Checkbox label="Disabled checked" disabled defaultChecked />
      <Checkbox label="Disabled indeterminate" disabled indeterminate />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Disabled state with 50% opacity and not-allowed cursor. Shown unchecked, checked, and indeterminate.',
      },
    },
  },
};

// ─── Group ────────────────────────────────────────────────────────────────────

export const Group: Story = {
  render: () => (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-sm font-medium text-text mb-2">Notification preferences</legend>
      <Checkbox
        label="Email"
        description="Get notified via email"
        defaultChecked
      />
      <Checkbox
        label="Push"
        description="Browser push notifications"
      />
      <Checkbox
        label="SMS"
        description="Text message alerts (carrier rates may apply)"
      />
    </fieldset>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Multiple checkboxes grouped in a fieldset with a legend for accessible grouping.',
      },
    },
  },
};

// ─── Mobile ───────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  render: () => (
    <div className="flex flex-col gap-3 p-4">
      <Checkbox
        label="Terms and conditions"
        description="I agree to the terms of service and privacy policy"
        size="md"
      />
      <Checkbox
        label="Marketing emails"
        description="Receive promotional emails and product updates"
        size="md"
        defaultChecked
      />
      <Checkbox
        label="Required field"
        error="You must check this box"
        size="md"
      />
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Checkboxes rendered at 375px mobile viewport width with label, description, and error states.',
      },
    },
  },
};
