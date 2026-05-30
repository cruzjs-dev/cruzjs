import type { Meta, StoryObj } from '@storybook/react';
import { ChartContainer } from './ChartContainer';
import type { TimeRange } from './ChartContainer';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const timeRanges: TimeRange[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: '1y', label: '1Y' },
];

// ─── Placeholder chart content ─────────────────────────────────────────────

const PlaceholderChart: React.FC<{ color?: string }> = ({ color = 'var(--color-primary)' }) => (
  <div
    className="w-full h-full rounded-lg"
    style={{
      background: `linear-gradient(135deg, color-mix(in srgb, ${color} 10%, transparent), color-mix(in srgb, ${color} 25%, transparent))`,
      border: `1px dashed color-mix(in srgb, ${color} 30%, transparent)`,
    }}
  />
);

const MockBarChart: React.FC = () => (
  <div className="flex items-end gap-2 h-full w-full pt-4">
    {[60, 80, 45, 90, 70, 85, 55, 95, 65, 75, 88, 50].map((h, i) => (
      <div
        key={i}
        className="flex-1 rounded-t"
        style={{
          height: `${h}%`,
          backgroundColor: 'color-mix(in srgb, var(--color-primary) 70%, transparent)',
        }}
      />
    ))}
  </div>
);

// ─── Legend items ───────────────────────────────────────────────────────────

const LegendItems: React.FC = () => (
  <div className="flex items-center gap-4">
    <div className="flex items-center gap-1.5">
      <span
        className="w-2.5 h-2.5 rounded-full"
        style={{ backgroundColor: 'var(--color-primary)' }}
      />
      <span className="text-xs text-text-secondary">Revenue</span>
    </div>
    <div className="flex items-center gap-1.5">
      <span
        className="w-2.5 h-2.5 rounded-full"
        style={{ backgroundColor: 'var(--color-success)' }}
      />
      <span className="text-xs text-text-secondary">Profit</span>
    </div>
    <div className="flex items-center gap-1.5">
      <span
        className="w-2.5 h-2.5 rounded-full"
        style={{ backgroundColor: 'var(--color-warning)' }}
      />
      <span className="text-xs text-text-secondary">Expenses</span>
    </div>
  </div>
);

// ─── Action button icons ───────────────────────────────────────────────────

const DownloadIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v8m0 0L5 7m3 3 3-3M3 12v1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1" />
  </svg>
);

const FullscreenIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2 6V3a1 1 0 0 1 1-1h3M14 6V3a1 1 0 0 0-1-1h-3M2 10v3a1 1 0 0 0 1 1h3M14 10v3a1 1 0 0 1-1 1h-3" />
  </svg>
);

const ActionButton: React.FC<{ children: React.ReactNode; label: string }> = ({ children, label }) => (
  <button
    type="button"
    aria-label={label}
    className="p-1.5 rounded-md text-text-muted hover:text-text-secondary hover:bg-surface-lighter transition-colors"
  >
    {children}
  </button>
);

// ─── Meta ───────────────────────────────────────────────────────────────────

const meta = {
  title: 'Data/ChartContainer',
  component: ChartContainer,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Responsive chart wrapper with title, subtitle, legend slot, time range selector, and empty state. Does not render charts — consumers provide chart content as children.',
      },
    },
  },
  argTypes: {
    height: { control: 'number' },
    loading: { control: 'boolean' },
    empty: { control: 'boolean' },
  },
  args: {
    title: 'Revenue Overview',
  },
} satisfies Meta<typeof ChartContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Default ────────────────────────────────────────────────────────────────

export const Default: Story = {
  render: () => (
    <ChartContainer title="Revenue Overview">
      <PlaceholderChart />
    </ChartContainer>
  ),
  parameters: {
    docs: {
      description: { story: 'Basic chart container with a placeholder colored div as chart content.' },
    },
  },
};

// ─── WithTimeRanges ─────────────────────────────────────────────────────────

export const WithTimeRanges: Story = {
  render: () => (
    <ChartContainer
      title="Revenue Overview"
      subtitle="Track revenue over time"
      timeRanges={timeRanges}
      activeTimeRange="30d"
    >
      <PlaceholderChart />
    </ChartContainer>
  ),
  parameters: {
    docs: {
      description: { story: '7D, 30D, 90D, and 1Y time range pills with 30D active.' },
    },
  },
};

// ─── WithLegend ─────────────────────────────────────────────────────────────

export const WithLegend: Story = {
  render: () => (
    <ChartContainer
      title="Financial Summary"
      subtitle="Revenue, profit, and expenses"
      legend={<LegendItems />}
    >
      <PlaceholderChart />
    </ChartContainer>
  ),
  parameters: {
    docs: {
      description: { story: 'Legend slot with colored dots and labels rendered between header and chart.' },
    },
  },
};

// ─── WithActions ────────────────────────────────────────────────────────────

export const WithActions: Story = {
  render: () => (
    <ChartContainer
      title="Revenue Overview"
      actions={
        <>
          <ActionButton label="Download">
            <DownloadIcon />
          </ActionButton>
          <ActionButton label="Fullscreen">
            <FullscreenIcon />
          </ActionButton>
        </>
      }
    >
      <PlaceholderChart />
    </ChartContainer>
  ),
  parameters: {
    docs: {
      description: { story: 'Action buttons (download, fullscreen) in the header.' },
    },
  },
};

// ─── Loading ────────────────────────────────────────────────────────────────

export const Loading: Story = {
  render: () => (
    <ChartContainer title="Revenue Overview" loading>
      <div />
    </ChartContainer>
  ),
  parameters: {
    docs: {
      description: { story: 'Loading state with centered spinner in the chart area.' },
    },
  },
};

// ─── Empty ──────────────────────────────────────────────────────────────────

export const Empty: Story = {
  render: () => (
    <ChartContainer title="Revenue Overview" empty emptyMessage="No revenue data for this period">
      <div />
    </ChartContainer>
  ),
  parameters: {
    docs: {
      description: { story: 'Empty state with bar chart icon and custom message.' },
    },
  },
};

// ─── CustomHeight ───────────────────────────────────────────────────────────

export const CustomHeight: Story = {
  render: () => (
    <ChartContainer title="Revenue Overview" height={500}>
      <PlaceholderChart />
    </ChartContainer>
  ),
  parameters: {
    docs: {
      description: { story: 'Chart area with custom height of 500px.' },
    },
  },
};

// ─── FullExample ────────────────────────────────────────────────────────────

export const FullExample: Story = {
  render: () => (
    <ChartContainer
      title="Revenue Overview"
      subtitle="Monthly revenue breakdown"
      timeRanges={timeRanges}
      activeTimeRange="30d"
      legend={<LegendItems />}
      actions={
        <>
          <ActionButton label="Download">
            <DownloadIcon />
          </ActionButton>
          <ActionButton label="Fullscreen">
            <FullscreenIcon />
          </ActionButton>
        </>
      }
    >
      <MockBarChart />
    </ChartContainer>
  ),
  parameters: {
    docs: {
      description: { story: 'Full example with time ranges, legend, actions, and mock chart bars.' },
    },
  },
};

// ─── Mobile ─────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  render: () => (
    <div className="p-4">
      <ChartContainer
        title="Revenue"
        subtitle="Last 30 days"
        timeRanges={timeRanges}
        activeTimeRange="30d"
      >
        <MockBarChart />
      </ChartContainer>
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: { story: 'ChartContainer at 375px mobile viewport width.' },
    },
  },
};
