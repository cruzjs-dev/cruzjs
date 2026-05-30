import type { Meta, StoryObj } from '@storybook/react';
import { FeatureGrid } from './FeatureGrid';
import type { FeatureItem } from './FeatureGrid';

// ─── Icons for stories ──────────────────────────────────────────────────────

const BoltIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className ?? 'w-5 h-5'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
  </svg>
);

const ShieldIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className ?? 'w-5 h-5'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);

const ServerIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className ?? 'w-5 h-5'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 17.25v-.228a4.5 4.5 0 00-.12-1.03l-2.268-9.64a3.375 3.375 0 00-3.285-2.602H7.923a3.375 3.375 0 00-3.285 2.602l-2.268 9.64a4.5 4.5 0 00-.12 1.03v.228m19.5 0a3 3 0 01-3 3H5.25a3 3 0 01-3-3m19.5 0a3 3 0 00-3-3H5.25a3 3 0 00-3 3m16.5 0h.008v.008h-.008v-.008zm-3 0h.008v.008h-.008v-.008z" />
  </svg>
);

const CodeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className ?? 'w-5 h-5'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
  </svg>
);

const CubeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className ?? 'w-5 h-5'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
  </svg>
);

const CloudIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className ?? 'w-5 h-5'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
  </svg>
);

// ─── Feature fixtures ──────────────────────────────────────────────────────

const defaultFeatures: FeatureItem[] = [
  {
    id: 'fast',
    icon: <BoltIcon />,
    title: 'Lightning Fast',
    description: 'Built for speed with edge-first architecture. Your app loads in milliseconds, not seconds.',
  },
  {
    id: 'secure',
    icon: <ShieldIcon />,
    title: 'Enterprise Security',
    description: 'SOC2 compliant with end-to-end encryption. Your data is safe with us.',
  },
  {
    id: 'scale',
    icon: <ServerIcon />,
    title: 'Infinite Scale',
    description: 'Auto-scales to millions of requests per second without breaking a sweat.',
  },
  {
    id: 'dx',
    icon: <CodeIcon />,
    title: 'Developer Experience',
    description: 'Type-safe APIs, hot reload, and first-class TypeScript support out of the box.',
  },
  {
    id: 'modular',
    icon: <CubeIcon />,
    title: 'Modular Architecture',
    description: 'Compose features from reusable modules. Add what you need, remove what you do not.',
  },
  {
    id: 'cloud',
    icon: <CloudIcon />,
    title: 'Cloud Native',
    description: 'Deploy anywhere with built-in adapters for every major cloud provider.',
  },
];

const featuresWithLinks: FeatureItem[] = defaultFeatures.map((f) => ({
  ...f,
  href: `/features/${f.id}`,
  linkLabel: 'Learn more',
}));

// ─── Meta ───────────────────────────────────────────────────────────────────

const meta = {
  title: 'Marketing/FeatureGrid',
  component: FeatureGrid,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Responsive feature card grid for marketing pages. Supports flat, outlined, and elevated card variants with configurable icon placement and optional CTAs.',
      },
    },
  },
  argTypes: {
    columns: { control: 'select', options: [2, 3, 4] },
    variant: { control: 'select', options: ['flat', 'outlined', 'elevated'] },
    iconPlacement: { control: 'select', options: ['top', 'left'] },
  },
  args: {
    features: defaultFeatures,
    heading: 'Everything you need',
    description: 'A complete toolkit for building modern SaaS applications at the edge.',
    variant: 'flat',
    iconPlacement: 'top',
    columns: 3,
  },
} satisfies Meta<typeof FeatureGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Default ────────────────────────────────────────────────────────────────

export const Default: Story = {};

// ─── TwoColumns ─────────────────────────────────────────────────────────────

export const TwoColumns: Story = {
  args: {
    columns: 2,
    features: defaultFeatures.slice(0, 4),
  },
  parameters: {
    docs: {
      description: { story: 'Two-column layout with four feature cards.' },
    },
  },
};

// ─── FourColumns ────────────────────────────────────────────────────────────

export const FourColumns: Story = {
  args: {
    columns: 4,
    features: defaultFeatures.slice(0, 4),
  },
  parameters: {
    docs: {
      description: { story: 'Four-column layout for wider viewports.' },
    },
  },
};

// ─── Outlined ───────────────────────────────────────────────────────────────

export const Outlined: Story = {
  args: {
    variant: 'outlined',
  },
  parameters: {
    docs: {
      description: { story: 'Cards with a subtle border instead of shadow or flat background.' },
    },
  },
};

// ─── Elevated ───────────────────────────────────────────────────────────────

export const Elevated: Story = {
  args: {
    variant: 'elevated',
  },
  parameters: {
    docs: {
      description: { story: 'Cards with a drop shadow for a raised, elevated appearance.' },
    },
  },
};

// ─── IconLeft ───────────────────────────────────────────────────────────────

export const IconLeft: Story = {
  args: {
    iconPlacement: 'left',
  },
  parameters: {
    docs: {
      description: { story: 'Icons placed to the left of the title and description for a compact row layout.' },
    },
  },
};

// ─── WithLinks ──────────────────────────────────────────────────────────────

export const WithLinks: Story = {
  args: {
    features: featuresWithLinks,
    variant: 'outlined',
  },
  parameters: {
    docs: {
      description: { story: 'Each feature has a "Learn more" CTA link with arrow icon.' },
    },
  },
};

// ─── Mobile ─────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  render: () => (
    <div className="p-4">
      <FeatureGrid
        features={defaultFeatures.slice(0, 3)}
        heading="Features"
        description="Everything you need."
        variant="outlined"
      />
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: { story: 'FeatureGrid at 375px mobile viewport width, stacked single column.' },
    },
  },
};
