import type { Meta, StoryObj } from '@storybook/react';
import { StatsGrid } from './StatsGrid';
import type { StatItem } from './StatsGrid';

// ─── Icons for stories ──────────────────────────────────────────────────────

const DollarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className ?? 'w-5 h-5'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
  </svg>
);

const UsersIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className ?? 'w-5 h-5'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0z" />
  </svg>
);

const ShoppingCartIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className ?? 'w-5 h-5'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0z" />
  </svg>
);

const ChartIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className ?? 'w-5 h-5'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125z" />
  </svg>
);

// ─── Stat fixtures ──────────────────────────────────────────────────────────

const defaultStats: StatItem[] = [
  { label: 'Revenue', value: '$12,345' },
  { label: 'Users', value: 1234 },
  { label: 'Orders', value: 456 },
  { label: 'Conversion', value: '3.2%' },
];

const trendStats: StatItem[] = [
  { label: 'Revenue', value: '$12,345', delta: 12.5, trend: 'up', description: 'vs last month' },
  { label: 'Users', value: 1234, delta: 8.1, trend: 'up', description: 'vs last month' },
  { label: 'Orders', value: 456, delta: 3.2, trend: 'down', description: 'vs last month' },
  { label: 'Conversion', value: '3.2%', delta: 0, trend: 'neutral', description: 'no change' },
];

const iconStats: StatItem[] = [
  { label: 'Revenue', value: '$12,345', delta: 12.5, trend: 'up', icon: <DollarIcon /> },
  { label: 'Users', value: 1234, delta: 8.1, trend: 'up', icon: <UsersIcon /> },
  { label: 'Orders', value: 456, delta: 3.2, trend: 'down', icon: <ShoppingCartIcon /> },
  { label: 'Conversion', value: '3.2%', delta: 0, trend: 'neutral', icon: <ChartIcon /> },
];

const clickableStats: StatItem[] = [
  { label: 'Revenue', value: '$12,345', delta: 12.5, trend: 'up', href: '/dashboard/revenue' },
  { label: 'Users', value: 1234, delta: 8.1, trend: 'up', href: '/dashboard/users' },
  { label: 'Orders', value: 456, delta: 3.2, trend: 'down', href: '/dashboard/orders' },
  { label: 'Conversion', value: '3.2%', href: '/dashboard/conversion' },
];

// ─── Meta ───────────────────────────────────────────────────────────────────

const meta = {
  title: 'Data/StatsGrid',
  component: StatsGrid,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Dashboard KPI card grid with trend indicators. Responsive columns. Zero domain coupling.',
      },
    },
  },
  argTypes: {
    columns: { control: 'select', options: [2, 3, 4] },
    variant: { control: 'select', options: ['default', 'compact', 'bordered'] },
  },
  args: {
    stats: defaultStats,
    variant: 'default',
  },
} satisfies Meta<typeof StatsGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Default ────────────────────────────────────────────────────────────────

export const Default: Story = {};

// ─── WithTrends ─────────────────────────────────────────────────────────────

export const WithTrends: Story = {
  render: () => <StatsGrid stats={trendStats} />,
  parameters: {
    docs: {
      description: { story: 'All stats have deltas and trend indicators showing up, down, and neutral.' },
    },
  },
};

// ─── Compact ────────────────────────────────────────────────────────────────

export const Compact: Story = {
  render: () => <StatsGrid stats={trendStats} variant="compact" />,
  parameters: {
    docs: {
      description: { story: 'Compact variant with lighter background, smaller padding, and no shadow.' },
    },
  },
};

// ─── Bordered ───────────────────────────────────────────────────────────────

export const Bordered: Story = {
  render: () => <StatsGrid stats={trendStats} variant="bordered" />,
  parameters: {
    docs: {
      description: { story: 'Bordered variant with explicit border and no shadow.' },
    },
  },
};

// ─── WithIcons ──────────────────────────────────────────────────────────────

export const WithIcons: Story = {
  render: () => <StatsGrid stats={iconStats} />,
  parameters: {
    docs: {
      description: { story: 'Each stat has an icon rendered in a tonal container.' },
    },
  },
};

// ─── TwoColumns ─────────────────────────────────────────────────────────────

export const TwoColumns: Story = {
  render: () => <StatsGrid stats={trendStats} columns={2} />,
  parameters: {
    docs: {
      description: { story: 'Forced two-column layout regardless of stat count.' },
    },
  },
};

// ─── Clickable ──────────────────────────────────────────────────────────────

export const Clickable: Story = {
  render: () => <StatsGrid stats={clickableStats} />,
  parameters: {
    docs: {
      description: { story: 'Stats with hrefs render as clickable cards with hover effects.' },
    },
  },
};

// ─── Mobile ─────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  render: () => (
    <div className="p-4">
      <StatsGrid stats={iconStats} />
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: { story: 'StatsGrid at 375px mobile viewport width, stacked single column.' },
    },
  },
};
