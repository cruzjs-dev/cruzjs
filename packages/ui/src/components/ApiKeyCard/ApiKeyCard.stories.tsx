import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ApiKeyCard } from './ApiKeyCard';

const meta = {
  title: 'Data/ApiKeyCard',
  component: ApiKeyCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'API key display card with masked key value, copy button, revoke action, and metadata.',
      },
    },
  },
  argTypes: {
    status: { control: 'select', options: ['active', 'expired', 'revoked'] },
    masked: { control: 'boolean' },
  },
} satisfies Meta<typeof ApiKeyCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: 'Production API Key',
    keyValue: 'sk_live_abc123def456ghi789',
    createdAt: 'Jan 15, 2026',
    lastUsed: '2 hours ago',
    status: 'active',
    onCopy: fn(),
    onRevoke: fn(),
    onRegenerate: fn(),
    onToggleMask: fn(),
  },
};

export const Revealed: Story = {
  args: {
    name: 'Production API Key',
    keyValue: 'sk_live_abc123def456ghi789',
    masked: false,
    createdAt: 'Jan 15, 2026',
    lastUsed: '2 hours ago',
    status: 'active',
    onCopy: fn(),
    onRevoke: fn(),
    onRegenerate: fn(),
    onToggleMask: fn(),
  },
};

export const Expired: Story = {
  args: {
    name: 'Legacy Integration Key',
    keyValue: 'sk_test_old999expired000',
    createdAt: 'Mar 1, 2025',
    lastUsed: '6 months ago',
    expiresAt: 'Sep 1, 2025',
    status: 'expired',
    onCopy: fn(),
    onRevoke: fn(),
    onRegenerate: fn(),
    onToggleMask: fn(),
  },
};

export const Revoked: Story = {
  args: {
    name: 'Compromised Key',
    keyValue: 'sk_live_revoked123456',
    createdAt: 'Feb 10, 2026',
    lastUsed: 'Apr 5, 2026',
    status: 'revoked',
    onCopy: fn(),
    onToggleMask: fn(),
  },
};

export const WithScopes: Story = {
  args: {
    name: 'Scoped API Key',
    keyValue: 'sk_live_scoped_abc123xyz',
    createdAt: 'Jan 20, 2026',
    lastUsed: '1 day ago',
    status: 'active',
    scopes: ['read', 'write'],
    onCopy: fn(),
    onRevoke: fn(),
    onRegenerate: fn(),
    onToggleMask: fn(),
  },
};

export const WithExpiry: Story = {
  args: {
    name: 'Temporary Access Key',
    keyValue: 'sk_live_temp_999888777',
    createdAt: 'May 1, 2026',
    lastUsed: 'Never',
    expiresAt: 'Jun 1, 2026',
    status: 'active',
    onCopy: fn(),
    onRevoke: fn(),
    onRegenerate: fn(),
    onToggleMask: fn(),
  },
};

export const Interactive: Story = {
  args: {
    name: 'Development Key',
    keyValue: 'sk_test_interactive_key_12345',
    createdAt: 'May 10, 2026',
    lastUsed: 'Just now',
    status: 'active',
    scopes: ['read', 'write', 'admin'],
    onCopy: fn(),
    onRevoke: fn(),
    onRegenerate: fn(),
    onToggleMask: fn(),
  },
};

export const Stacked: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-[420px]">
      <ApiKeyCard
        name="Production Key"
        keyValue="sk_live_prod_aaa111bbb222"
        createdAt="Jan 5, 2026"
        lastUsed="5 minutes ago"
        status="active"
        scopes={['read', 'write']}
        onCopy={fn()}
        onRevoke={fn()}
        onRegenerate={fn()}
        onToggleMask={fn()}
      />
      <ApiKeyCard
        name="Staging Key"
        keyValue="sk_test_stg_ccc333ddd444"
        createdAt="Feb 12, 2026"
        lastUsed="3 days ago"
        expiresAt="Aug 12, 2026"
        status="active"
        onCopy={fn()}
        onRevoke={fn()}
        onRegenerate={fn()}
        onToggleMask={fn()}
      />
      <ApiKeyCard
        name="Deprecated Key"
        keyValue="sk_live_old_eee555fff666"
        createdAt="Nov 20, 2025"
        lastUsed="Jan 3, 2026"
        status="revoked"
        onCopy={fn()}
        onToggleMask={fn()}
      />
    </div>
  ),
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  render: () => (
    <div className="p-4 space-y-4">
      <ApiKeyCard
        name="Mobile API Key"
        keyValue="sk_live_mobile_xyz789abc"
        createdAt="Apr 1, 2026"
        lastUsed="1 hour ago"
        status="active"
        scopes={['read']}
        onCopy={fn()}
        onRevoke={fn()}
        onRegenerate={fn()}
        onToggleMask={fn()}
      />
      <ApiKeyCard
        name="Expired Mobile Key"
        keyValue="sk_test_mob_expired_000"
        createdAt="Dec 1, 2025"
        lastUsed="3 months ago"
        expiresAt="Mar 1, 2026"
        status="expired"
        onCopy={fn()}
        onRevoke={fn()}
        onToggleMask={fn()}
      />
    </div>
  ),
};
