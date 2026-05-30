import type { Meta, StoryObj } from '@storybook/react';
import { userEvent, within, expect } from '@storybook/test';
import { Alert } from './Alert';
import type { AlertVariant, AlertSize } from './Alert';

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Feedback/Alert',
  component: Alert,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Inline status message component. Supports info, success, warning, and error variants with optional title, description, icon, and dismiss functionality.',
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['info', 'success', 'warning', 'error'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    title: { control: 'text' },
    dismissible: { control: 'boolean' },
  },
  args: {
    variant: 'info',
    size: 'md',
    title: 'Heads up',
    children: 'This is an informational alert to keep you updated.',
    dismissible: false,
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Default ────────────────────────────────────────────────────────────────

export const Default: Story = {};

// ─── Variants ───────────────────────────────────────────────────────────────

export const Variants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(['info', 'success', 'warning', 'error'] as const).map((variant) => (
        <Alert key={variant} variant={variant} title={`${variant.charAt(0).toUpperCase()}${variant.slice(1)}`}>
          This is a {variant} alert with a title and description.
        </Alert>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: { story: 'All four variants side by side: info, success, warning, error.' },
    },
  },
};

// ─── Sizes ──────────────────────────────────────────────────────────────────

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Alert key={size} variant="info" size={size} title={`Size: ${size}`}>
          This alert demonstrates the {size} size variant.
        </Alert>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: { story: 'Small, medium, and large sizes with proportional padding, icon size, and typography.' },
    },
  },
};

// ─── WithTitle ──────────────────────────────────────────────────────────────

export const WithTitle: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Alert variant="success" title="Payment processed">
        Your subscription has been renewed. The next billing date is July 1, 2026.
      </Alert>
      <Alert variant="error" title="Deployment failed">
        Build step 3/5 exited with code 1. Check the logs for details.
      </Alert>
    </div>
  ),
  parameters: {
    docs: {
      description: { story: 'Alerts with a bold title and supporting description text.' },
    },
  },
};

// ─── Dismissible ────────────────────────────────────────────────────────────

export const Dismissible: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Alert variant="info" title="Dismissible alert" dismissible>
        Click the close button to dismiss this alert. It will fade out smoothly.
      </Alert>
      <Alert variant="warning" dismissible>
        This warning can be dismissed too.
      </Alert>
    </div>
  ),
  parameters: {
    docs: {
      description: { story: 'Alerts with a close button. Clicking dismiss triggers a fade-out animation.' },
    },
  },
};

// ─── IconOnly ───────────────────────────────────────────────────────────────

const BellIcon = () => (
  <svg className="w-5 h-5 text-primary" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M10 2a6 6 0 00-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 00.515 1.076 32.91 32.91 0 003.256.508 3.5 3.5 0 006.972 0 32.903 32.903 0 003.256-.508.75.75 0 00.515-1.076A11.448 11.448 0 0116 8a6 6 0 00-6-6zM8.05 14.943a33.54 33.54 0 003.9 0 2 2 0 01-3.9 0z"
      clipRule="evenodd"
    />
  </svg>
);

export const IconOnly: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Alert variant="info">
        Default info icon with description only, no title.
      </Alert>
      <Alert variant="success" icon={<BellIcon />}>
        Custom bell icon instead of the default check icon.
      </Alert>
    </div>
  ),
  parameters: {
    docs: {
      description: { story: 'Alerts with just an icon and text, no title.' },
    },
  },
};

// ─── Mobile ─────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  render: () => (
    <div className="flex flex-col gap-4 p-4">
      <Alert variant="info" title="Mobile view" dismissible>
        This alert is displayed at a 375px mobile viewport width.
      </Alert>
      <Alert variant="error" title="Connection lost">
        Please check your internet connection and try again.
      </Alert>
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile' },
    layout: 'fullscreen',
    docs: {
      description: { story: 'Alerts rendered at 375px mobile viewport width.' },
    },
  },
};

// ─── OnDark ─────────────────────────────────────────────────────────────────

export const OnDark: Story = {
  render: () => (
    <div className="rounded-xl bg-dark-surface p-6 flex flex-col gap-4">
      {(['info', 'success', 'warning', 'error'] as const).map((variant) => (
        <Alert key={variant} variant={variant} title={`${variant.charAt(0).toUpperCase()}${variant.slice(1)} on dark`} dismissible>
          Alert on a dark background surface to test contrast.
        </Alert>
      ))}
    </div>
  ),
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: { story: 'All variants on a dark background to verify contrast and readability.' },
    },
  },
};

// ─── Composition ────────────────────────────────────────────────────────────

export const Composition: Story = {
  render: () => (
    <div className="rounded-xl border border-surface-border bg-surface shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] p-6 max-w-lg">
      <h2 className="text-sm font-semibold text-text-strong mb-4">Create Organization</h2>

      <Alert variant="info" size="sm" className="mb-4">
        Organizations allow you to collaborate with team members.
      </Alert>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Name</label>
          <input
            type="text"
            className="w-full rounded-lg border border-input-border px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Acme Inc."
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Slug</label>
          <input
            type="text"
            className="w-full rounded-lg border border-input-border px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="acme-inc"
          />
        </div>
      </div>

      <Alert variant="warning" size="sm" className="mt-4">
        The slug cannot be changed after creation.
      </Alert>

      <div className="mt-4 flex justify-end">
        <button className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors">
          Create
        </button>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: { story: 'Alert used inside a card/form context to show contextual guidance and warnings.' },
    },
  },
};

// ─── Interactive ────────────────────────────────────────────────────────────

export const Interactive: Story = {
  render: () => (
    <Alert variant="success" title="Action completed" dismissible>
      Click the dismiss button to close this alert.
    </Alert>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify the alert is visible
    const alert = canvas.getByRole('status');
    await expect(alert).toBeVisible();

    // Verify dismiss button exists
    const dismissBtn = canvas.getByRole('button', { name: 'Dismiss alert' });
    await expect(dismissBtn).toBeVisible();

    // Click dismiss
    await userEvent.click(dismissBtn);

    // After clicking, the alert should start fading (opacity transition)
    // The element may still be in the DOM briefly during animation
    await expect(alert).toHaveClass('opacity-0');
  },
  parameters: {
    docs: {
      description: { story: 'Interactive play function that clicks the dismiss button and verifies the fade-out.' },
    },
  },
};
