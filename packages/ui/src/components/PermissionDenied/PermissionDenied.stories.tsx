import type { Meta, StoryObj } from '@storybook/react';
import { PermissionDenied } from './PermissionDenied';

// ─── Icons for stories ──────────────────────────────────────────────────────

const ShieldExclamationIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className ?? 'w-7 h-7'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.25-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
  </svg>
);

const NoSymbolIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className ?? 'w-7 h-7'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
  </svg>
);

// ─── Meta ────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Feedback/PermissionDenied',
  component: PermissionDenied,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Access denied / forbidden state display. Shows a tonal warning icon, title, message, and optional primary/secondary actions. Used when a user lacks permissions for a resource or action.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    title: { control: 'text' },
    message: { control: 'text' },
  },
  args: {
    message: 'You do not have permission to access this resource.',
    size: 'md',
  },
} satisfies Meta<typeof PermissionDenied>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Default ────────────────────────────────────────────────────────────────

export const Default: Story = {};

// ─── WithActions ────────────────────────────────────────────────────────────

export const WithActions: Story = {
  render: () => (
    <PermissionDenied
      message="You need the 'Admin' role to manage billing settings."
      action={{ label: 'Go to Dashboard', onClick: () => {} }}
      secondaryAction={{ label: 'Contact Admin', onClick: () => {} }}
    />
  ),
  parameters: {
    docs: {
      description: { story: 'Permission denied state with both primary and secondary action buttons.' },
    },
  },
};

// ─── CustomIcon ─────────────────────────────────────────────────────────────

export const CustomIcon: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <PermissionDenied
        icon={<ShieldExclamationIcon />}
        title="Restricted Area"
        message="This section requires elevated privileges."
        action={{ label: 'Request Access', onClick: () => {} }}
      />
      <PermissionDenied
        icon={<NoSymbolIcon />}
        title="Blocked"
        message="Your account has been restricted from performing this action."
        action={{ label: 'Learn Why', onClick: () => {} }}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: { story: 'Custom icons to convey different types of access denial.' },
    },
  },
};

// ─── Sizes ──────────────────────────────────────────────────────────────────

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} className="rounded-xl border border-surface-border bg-surface">
          <PermissionDenied
            size={size}
            message={`This is the ${size} size variant.`}
            action={{ label: 'Action', onClick: () => {} }}
          />
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: { story: 'Small, medium, and large sizes with proportional spacing, icon area, and typography.' },
    },
  },
};

// ─── Mobile ─────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  render: () => (
    <div className="p-4">
      <PermissionDenied
        message="You need the Editor role to modify this project."
        action={{ label: 'Go Back', onClick: () => {} }}
        secondaryAction={{ label: 'Request Access', onClick: () => {} }}
      />
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: { story: 'PermissionDenied rendered at 375px mobile viewport width.' },
    },
  },
};
