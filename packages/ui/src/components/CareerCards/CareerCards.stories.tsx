import type { Meta, StoryObj } from '@storybook/react';
import { CareerCards } from './CareerCards';
import type { JobPosition } from './CareerCards';

// ─── Position fixtures ─────────────────────────────────────────────────────

const samplePositions: JobPosition[] = [
  {
    id: 'eng-frontend',
    title: 'Senior Frontend Engineer',
    department: 'Engineering',
    location: 'Remote',
    type: 'full-time',
    description:
      'Build beautiful, performant UIs with React and TypeScript. Work closely with design and product teams to ship features that delight users.',
    href: '/careers/senior-frontend-engineer',
  },
  {
    id: 'eng-backend',
    title: 'Backend Engineer',
    department: 'Engineering',
    location: 'San Francisco, CA',
    type: 'full-time',
    description:
      'Design and implement scalable APIs, database schemas, and background job pipelines on Cloudflare Workers.',
    href: '/careers/backend-engineer',
  },
  {
    id: 'design-product',
    title: 'Product Designer',
    department: 'Design',
    location: 'New York, NY',
    type: 'part-time',
    description:
      'Shape the future of our product experience through user research, prototyping, and high-fidelity design.',
    href: '/careers/product-designer',
  },
  {
    id: 'ops-devops',
    title: 'DevOps Contractor',
    department: 'Infrastructure',
    location: 'Remote',
    type: 'contract',
    description:
      'Manage CI/CD pipelines, monitoring, and cloud infrastructure across multiple environments.',
    href: '/careers/devops-contractor',
  },
  {
    id: 'intern-eng',
    title: 'Engineering Intern',
    department: 'Engineering',
    location: 'San Francisco, CA',
    type: 'internship',
    description:
      'Join our engineering team for a summer of hands-on learning, mentorship, and real-world project experience.',
    href: '/careers/engineering-intern',
  },
];

// ─── Meta ───────────────────────────────────────────────────────────────────

const meta = {
  title: 'Marketing/CareerCards',
  component: CareerCards,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Responsive grid of job listing cards with department, location, and type badges. Zero domain coupling.',
      },
    },
  },
  argTypes: {
    columns: { control: 'select', options: [1, 2, 3] },
  },
  args: {
    positions: samplePositions.slice(0, 3),
  },
} satisfies Meta<typeof CareerCards>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Default ────────────────────────────────────────────────────────────────

export const Default: Story = {};

// ─── SingleColumn ───────────────────────────────────────────────────────────

export const SingleColumn: Story = {
  render: () => <CareerCards positions={samplePositions.slice(0, 3)} columns={1} />,
  parameters: {
    docs: {
      description: {
        story: 'Single-column layout, ideal for sidebar or narrow containers.',
      },
    },
  },
};

// ─── WithDescriptions ──────────────────────────────────────────────────────

export const WithDescriptions: Story = {
  render: () => <CareerCards positions={samplePositions} />,
  parameters: {
    docs: {
      description: {
        story: 'All five positions with descriptions, showing all four job types.',
      },
    },
  },
};

// ─── WithHeading ────────────────────────────────────────────────────────────

export const WithHeading: Story = {
  render: () => (
    <CareerCards
      positions={samplePositions.slice(0, 3)}
      heading="Open Positions"
      description="Join our team and help us build the future of full-stack development."
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Section heading and description rendered above the card grid.',
      },
    },
  },
};

// ─── Mobile ─────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  render: () => (
    <div className="p-4">
      <CareerCards
        positions={samplePositions.slice(0, 3)}
        heading="Open Positions"
      />
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'CareerCards at 375px mobile viewport width, stacked single column.',
      },
    },
  },
};
