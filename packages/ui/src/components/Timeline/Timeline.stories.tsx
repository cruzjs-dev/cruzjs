import type { Meta, StoryObj } from '@storybook/react';
import { Timeline, TimelineItem } from './Timeline';
import type { TimelineColor, TimelineSize } from './Timeline';

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'UI/Timeline',
  component: Timeline,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Vertical timeline for displaying chronological events. Supports multiple colors, sizes, icon dots, active state highlighting, and alternate left/right alignment.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    lineStyle: { control: 'select', options: ['solid', 'dashed'] },
    align: { control: 'select', options: ['left', 'alternate'] },
  },
  args: {
    size: 'md',
    lineStyle: 'solid',
    align: 'left',
  },
} satisfies Meta<typeof Timeline>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const allColors: TimelineColor[] = ['primary', 'success', 'warning', 'danger', 'info'];
const allSizes: TimelineSize[] = ['sm', 'md', 'lg'];

const RocketIcon: React.FC = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-full h-full">
    <path fillRule="evenodd" d="M4.5 2A2.5 2.5 0 0 0 2 4.5v3.879a2.5 2.5 0 0 0 .732 1.767l7.5 7.5a2.5 2.5 0 0 0 3.536 0l3.878-3.878a2.5 2.5 0 0 0 0-3.536l-7.5-7.5A2.5 2.5 0 0 0 8.38 2H4.5Z" clipRule="evenodd" />
  </svg>
);

const CheckIcon: React.FC = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-full h-full">
    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
  </svg>
);

const CodeIcon: React.FC = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-full h-full">
    <path fillRule="evenodd" d="M6.28 5.22a.75.75 0 0 1 0 1.06L2.56 10l3.72 3.72a.75.75 0 0 1-1.06 1.06L.97 10.53a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Zm7.44 0a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L17.44 10l-3.72-3.72a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
  </svg>
);

const BugIcon: React.FC = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-full h-full">
    <path d="M8 2a2 2 0 0 0-2 2v1H4a1 1 0 0 0 0 2h2v1a4 4 0 0 0 .34 1.61L4.21 11.78a1 1 0 1 0 1.42 1.42L7.54 11.3A4 4 0 0 0 10 12a4 4 0 0 0 2.46-.7l1.91 1.9a1 1 0 0 0 1.42-1.42l-2.13-2.13A4 4 0 0 0 14 8V7h2a1 1 0 1 0 0-2h-2V4a2 2 0 0 0-2-2H8Z" />
  </svg>
);

// ─── Default ──────────────────────────────────────────────────────────────────

export const Default: Story = {
  render: (args) => (
    <Timeline {...args}>
      <TimelineItem
        title="Project created"
        description="Repository initialized with default configuration."
        timestamp="3 days ago"
      />
      <TimelineItem
        title="First commit pushed"
        description="Initial codebase with core modules and authentication flow."
        timestamp="2 days ago"
      />
      <TimelineItem
        title="CI pipeline configured"
        description="GitHub Actions set up for build, test, and deployment."
        timestamp="1 day ago"
      />
      <TimelineItem
        title="v1.0.0 released"
        timestamp="Just now"
      />
    </Timeline>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Basic timeline with titles, descriptions, and timestamps.',
      },
    },
  },
};

// ─── WithIcons ────────────────────────────────────────────────────────────────

export const WithIcons: Story = {
  render: (args) => (
    <Timeline {...args}>
      <TimelineItem
        title="Feature branch created"
        description="Branch feature/auth-flow created from main."
        timestamp="4h ago"
        icon={<CodeIcon />}
        color="info"
      />
      <TimelineItem
        title="Bug fix committed"
        description="Fixed edge case in token refresh logic."
        timestamp="3h ago"
        icon={<BugIcon />}
        color="danger"
      />
      <TimelineItem
        title="Tests passing"
        description="All 142 unit tests and 38 integration tests green."
        timestamp="2h ago"
        icon={<CheckIcon />}
        color="success"
      />
      <TimelineItem
        title="Deployed to production"
        timestamp="1h ago"
        icon={<RocketIcon />}
        color="primary"
      />
    </Timeline>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Timeline items with custom SVG icons in colored dot backgrounds.',
      },
    },
  },
};

// ─── Alternate ────────────────────────────────────────────────────────────────

export const Alternate: Story = {
  render: (args) => (
    <Timeline {...args} align="alternate">
      <TimelineItem
        title="Planning phase"
        description="Requirements gathered and user stories defined."
        timestamp="Week 1"
        color="info"
      />
      <TimelineItem
        title="Design phase"
        description="Wireframes and prototypes created and approved."
        timestamp="Week 2"
        color="primary"
      />
      <TimelineItem
        title="Development phase"
        description="Core features implemented with test coverage."
        timestamp="Week 3-4"
        color="warning"
      />
      <TimelineItem
        title="QA and launch"
        description="Final testing completed and production deployment."
        timestamp="Week 5"
        color="success"
      />
    </Timeline>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Alternate alignment places odd items on the left and even items on the right of the timeline.',
      },
    },
  },
};

// ─── DashedLine ───────────────────────────────────────────────────────────────

export const DashedLine: Story = {
  render: (args) => (
    <Timeline {...args} lineStyle="dashed">
      <TimelineItem
        title="Order placed"
        description="Your order has been confirmed."
        timestamp="10:00 AM"
        color="primary"
      />
      <TimelineItem
        title="Processing"
        description="Your order is being prepared."
        timestamp="10:30 AM"
        color="warning"
      />
      <TimelineItem
        title="Shipped"
        description="Package is on its way."
        timestamp="2:00 PM"
        color="info"
      />
      <TimelineItem
        title="Delivered"
        timestamp="5:00 PM"
        color="success"
      />
    </Timeline>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Timeline with dashed connector lines between items.',
      },
    },
  },
};

// ─── ActiveItem ───────────────────────────────────────────────────────────────

export const ActiveItem: Story = {
  render: (args) => (
    <Timeline {...args}>
      <TimelineItem
        title="Account created"
        description="Email verified and profile completed."
        timestamp="Jan 15"
        color="success"
      />
      <TimelineItem
        title="First project"
        description="Created 'My App' project with default settings."
        timestamp="Jan 16"
        color="success"
      />
      <TimelineItem
        title="Team setup"
        description="Invite your team members to collaborate."
        timestamp="Now"
        color="primary"
        active
      />
      <TimelineItem
        title="Deploy"
        description="Ship your first production release."
        color="primary"
      />
    </Timeline>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Active item shows a ring glow and slightly larger dot to indicate current progress.',
      },
    },
  },
};

// ─── Colors ───────────────────────────────────────────────────────────────────

export const Colors: Story = {
  render: (args) => (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-xs font-medium text-text-secondary mb-3">Standard dots</p>
        <Timeline {...args}>
          {allColors.map((color) => (
            <TimelineItem
              key={color}
              title={`${color.charAt(0).toUpperCase()}${color.slice(1)} event`}
              description={`This item uses the ${color} color variant.`}
              color={color}
            />
          ))}
        </Timeline>
      </div>
      <div>
        <p className="text-xs font-medium text-text-secondary mb-3">Active dots with ring glow</p>
        <Timeline {...args}>
          {allColors.map((color) => (
            <TimelineItem
              key={color}
              title={`${color.charAt(0).toUpperCase()}${color.slice(1)} active`}
              color={color}
              active
            />
          ))}
        </Timeline>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All five color variants shown in standard and active states.',
      },
    },
  },
};

// ─── Sizes ────────────────────────────────────────────────────────────────────

export const Sizes: Story = {
  render: () => (
    <div className="flex gap-12">
      {allSizes.map((size) => (
        <div key={size} className="flex-1">
          <p className="text-xs font-medium text-text-secondary mb-3">
            Size: {size}
          </p>
          <Timeline size={size}>
            <TimelineItem
              title="First event"
              description="A brief description."
              timestamp="1h ago"
            />
            <TimelineItem
              title="Second event"
              description="Another description."
              timestamp="30m ago"
              active
            />
            <TimelineItem
              title="Third event"
              timestamp="Just now"
            />
          </Timeline>
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Side-by-side comparison of small, medium, and large sizes showing proportional dot, text, and spacing changes.',
      },
    },
  },
};

// ─── Mobile ───────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  render: () => (
    <div className="p-4">
      <Timeline size="sm">
        <TimelineItem
          title="Signed up"
          description="Welcome to the platform."
          timestamp="Jan 1"
          color="success"
        />
        <TimelineItem
          title="Completed onboarding"
          timestamp="Jan 2"
          color="primary"
          active
        />
        <TimelineItem
          title="Invited team"
          timestamp="Pending"
          color="info"
        />
      </Timeline>
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Timeline rendered at 375px mobile viewport width with compact sm size.',
      },
    },
  },
};
