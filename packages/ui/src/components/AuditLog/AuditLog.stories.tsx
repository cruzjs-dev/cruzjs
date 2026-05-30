import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { AuditLog } from './AuditLog';
import type { AuditLogEntry, AuditLogFilter } from './AuditLog';

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Data/AuditLog',
  component: AuditLog,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Timestamped event table for audit logs. Shows user, action, resource, and timestamp with filters. Zero domain coupling -- all data via props.',
      },
    },
  },
  argTypes: {
    showFilters: { control: 'boolean' },
    loading: { control: 'boolean' },
    emptyMessage: { control: 'text' },
  },
  args: {
    showFilters: true,
    loading: false,
  },
} satisfies Meta<typeof AuditLog>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Fixtures ────────────────────────────────────────────────────────────────

const sampleEntries: AuditLogEntry[] = [
  {
    id: '1',
    user: { name: 'Alice Chen', email: 'alice@example.com', avatarSrc: 'https://api.dicebear.com/7.x/initials/svg?seed=AC' },
    action: 'created',
    resource: 'API Key',
    resourceId: 'key-prod-01',
    description: 'Created production API key',
    timestamp: '2 hours ago',
    metadata: { ip: '192.168.1.100', browser: 'Chrome 120' },
    severity: 'info',
  },
  {
    id: '2',
    user: { name: 'Bob Smith' },
    action: 'updated',
    resource: 'Settings',
    description: 'Changed organization display name',
    timestamp: '1 hour ago',
  },
  {
    id: '3',
    user: { name: 'Carol Davis', email: 'carol@example.com' },
    action: 'deleted',
    resource: 'Member',
    resourceId: 'mem-42',
    description: 'Removed inactive team member',
    timestamp: '45 minutes ago',
    severity: 'danger',
  },
  {
    id: '4',
    user: { name: 'Dave Wilson', avatarSrc: 'https://api.dicebear.com/7.x/initials/svg?seed=DW' },
    action: 'invited',
    resource: 'Member',
    description: 'Invited new team member',
    timestamp: '30 minutes ago',
  },
  {
    id: '5',
    user: { name: 'Eve Johnson' },
    action: 'created',
    resource: 'Webhook',
    resourceId: 'wh-03',
    timestamp: '20 minutes ago',
    metadata: { url: 'https://api.example.com/hooks', events: 'user.created, user.updated' },
  },
  {
    id: '6',
    user: { name: 'Frank Lee', email: 'frank@example.com' },
    action: 'updated',
    resource: 'API Key',
    resourceId: 'key-dev-02',
    description: 'Rotated development API key',
    timestamp: '15 minutes ago',
    severity: 'warning',
  },
  {
    id: '7',
    user: { name: 'Grace Kim' },
    action: 'deleted',
    resource: 'Webhook',
    resourceId: 'wh-01',
    timestamp: '10 minutes ago',
  },
  {
    id: '8',
    user: { name: 'Henry Park', avatarSrc: 'https://api.dicebear.com/7.x/initials/svg?seed=HP' },
    action: 'created',
    resource: 'Member',
    description: 'Added via SSO provisioning',
    timestamp: 'Just now',
    metadata: { provider: 'Okta', role: 'Viewer' },
  },
];

// ─── Default ─────────────────────────────────────────────────────────────────

export const Default: Story = {
  args: {
    entries: sampleEntries,
    showFilters: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Basic audit log with 8 entries showing varied actions, resources, and users.',
      },
    },
  },
};

// ─── WithFilters ─────────────────────────────────────────────────────────────

const WithFiltersRender: React.FC = () => {
  const [filters, setFilters] = useState<AuditLogFilter>({});
  return (
    <AuditLog
      entries={sampleEntries}
      showFilters={true}
      filters={filters}
      onFilterChange={setFilters}
    />
  );
};

export const WithFilters: Story = {
  render: () => <WithFiltersRender />,
  parameters: {
    docs: {
      description: {
        story: 'Filter bar visible with interactive action, user, and resource dropdowns. Change a filter to see the onFilterChange callback fire.',
      },
    },
  },
};

// ─── WithSeverity ────────────────────────────────────────────────────────────

const severityEntries: AuditLogEntry[] = [
  {
    id: 'sev-1',
    user: { name: 'System' },
    action: 'created',
    resource: 'Backup',
    description: 'Daily backup completed successfully',
    timestamp: '6 hours ago',
    severity: 'info',
  },
  {
    id: 'sev-2',
    user: { name: 'Alice Chen' },
    action: 'updated',
    resource: 'Security Policy',
    description: 'MFA requirement changed to optional',
    timestamp: '4 hours ago',
    severity: 'warning',
  },
  {
    id: 'sev-3',
    user: { name: 'Unknown IP' },
    action: 'deleted',
    resource: 'Admin Role',
    description: 'Critical role removed from organization',
    timestamp: '2 hours ago',
    severity: 'danger',
  },
  {
    id: 'sev-4',
    user: { name: 'Bob Smith' },
    action: 'updated',
    resource: 'Settings',
    description: 'Updated notification preferences',
    timestamp: '1 hour ago',
  },
];

export const WithSeverity: Story = {
  args: {
    entries: severityEntries,
    showFilters: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Entries with severity levels shown as colored left borders: info (blue), warning (amber), danger (red).',
      },
    },
  },
};

// ─── Loading ─────────────────────────────────────────────────────────────────

export const Loading: Story = {
  args: {
    entries: [],
    loading: true,
    showFilters: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Loading state with a centered spinner. Entries and empty message are hidden.',
      },
    },
  },
};

// ─── Empty ───────────────────────────────────────────────────────────────────

export const Empty: Story = {
  args: {
    entries: [],
    showFilters: false,
    emptyMessage: 'No activity recorded yet.',
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty state with a custom message when there are no audit log entries.',
      },
    },
  },
};

// ─── WithPagination ──────────────────────────────────────────────────────────

const WithPaginationRender: React.FC = () => {
  const [page, setPage] = useState(1);
  const pageSize = 3;
  const start = (page - 1) * pageSize;
  const pageEntries = sampleEntries.slice(start, start + pageSize);

  return (
    <AuditLog
      entries={pageEntries}
      showFilters={false}
      pagination={{
        page,
        pageSize,
        total: sampleEntries.length,
        onPageChange: setPage,
      }}
    />
  );
};

export const WithPagination: Story = {
  render: () => <WithPaginationRender />,
  parameters: {
    docs: {
      description: {
        story: 'Paginated audit log with previous/next controls. 3 entries per page, 8 total entries.',
      },
    },
  },
};

// ─── Clickable ───────────────────────────────────────────────────────────────

const clickableEntries: AuditLogEntry[] = [
  {
    id: 'click-1',
    user: { name: 'Alice Chen' },
    action: 'created',
    resource: 'API Key',
    resourceId: 'key-01',
    timestamp: '2 hours ago',
    metadata: { ip: '10.0.0.1', browser: 'Firefox', os: 'macOS' },
  },
  {
    id: 'click-2',
    user: { name: 'Bob Smith' },
    action: 'updated',
    resource: 'Settings',
    timestamp: '1 hour ago',
    metadata: { field: 'displayName', oldValue: 'Acme Inc', newValue: 'Acme Corp' },
  },
  {
    id: 'click-3',
    user: { name: 'Carol Davis' },
    action: 'deleted',
    resource: 'Webhook',
    resourceId: 'wh-05',
    timestamp: '30 minutes ago',
    metadata: { url: 'https://hooks.example.com/endpoint', reason: 'Endpoint deprecated' },
  },
];

const ClickableRender: React.FC = () => {
  return (
    <AuditLog
      entries={clickableEntries}
      showFilters={false}
      onEntryClick={() => {
        /* expand in-place via internal state */
      }}
    />
  );
};

export const Clickable: Story = {
  render: () => <ClickableRender />,
  parameters: {
    docs: {
      description: {
        story: 'Click a row to expand and view metadata key-value pairs. The onEntryClick callback toggles an expandable detail section.',
      },
    },
  },
};

// ─── Mobile ──────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  args: {
    entries: sampleEntries.slice(0, 4),
    showFilters: false,
  },
  render: (args) => (
    <div className="p-4">
      <AuditLog {...args} />
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Audit log rendered at 375px mobile viewport width.',
      },
    },
  },
};
