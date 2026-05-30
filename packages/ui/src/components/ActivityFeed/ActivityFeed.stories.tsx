import type { Meta, StoryObj } from '@storybook/react';
import { ActivityFeed } from './ActivityFeed';
import type { ActivityFeedColor, ActivityFeedItem, ActivityFeedSize } from './ActivityFeed';

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'UI/ActivityFeed',
  component: ActivityFeed,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Vertical activity feed for displaying event streams. Shows actor, action, target, timestamp, and optional content. Supports icons, avatars, color variants, connector lines, and multiple sizes.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    showConnector: { control: 'boolean' },
  },
  args: {
    size: 'md',
    showConnector: true,
  },
} satisfies Meta<typeof ActivityFeed>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const allColors: ActivityFeedColor[] = ['primary', 'success', 'warning', 'danger', 'info'];
const allSizes: ActivityFeedSize[] = ['sm', 'md', 'lg'];

const GitCommitIcon: React.FC = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-full h-full">
    <path fillRule="evenodd" d="M10 2a1 1 0 0 1 1 1v4.07a4.001 4.001 0 0 1 0 5.86V17a1 1 0 1 1-2 0v-4.07a4.001 4.001 0 0 1 0-5.86V3a1 1 0 0 1 1-1Zm-2 8a2 2 0 1 1 4 0 2 2 0 0 1-4 0Z" clipRule="evenodd" />
  </svg>
);

const MergeIcon: React.FC = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-full h-full">
    <path d="M10 2a1 1 0 0 1 1 1v1.323l3.954 1.582 1.599-.8a1 1 0 0 1 .894 1.79l-1.233.616a1 1 0 0 1-.894 0l-2.212-1.106L11 7.64V17a1 1 0 1 1-2 0V7.64L6.892 6.405l-2.212 1.106a1 1 0 0 1-.894 0L2.553 6.895a1 1 0 0 1 .894-1.79l1.599.8L9 4.323V3a1 1 0 0 1 1-1Z" />
  </svg>
);

const CheckIcon: React.FC = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-full h-full">
    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
  </svg>
);

const AlertIcon: React.FC = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-full h-full">
    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
  </svg>
);

const CommentIcon: React.FC = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-full h-full">
    <path fillRule="evenodd" d="M3.43 2.524A41.29 41.29 0 0 1 10 2c2.236 0 4.43.18 6.57.524 1.437.231 2.43 1.49 2.43 2.902v5.148c0 1.413-.993 2.67-2.43 2.902a41.202 41.202 0 0 1-3.55.414c-.28.02-.521.18-.643.413l-1.712 3.293a.75.75 0 0 1-1.33 0l-1.713-3.293a.783.783 0 0 0-.642-.413 41.202 41.202 0 0 1-3.55-.414C1.993 13.245 1 11.986 1 10.574V5.426c0-1.413.993-2.67 2.43-2.902Z" clipRule="evenodd" />
  </svg>
);

// ─── Default ──────────────────────────────────────────────────────────────────

const defaultItems: ActivityFeedItem[] = [
  {
    id: '1',
    actor: 'Alice Chen',
    action: 'created',
    target: 'Project Alpha',
    timestamp: '2 hours ago',
  },
  {
    id: '2',
    actor: 'Bob Smith',
    action: 'pushed to',
    target: 'main',
    timestamp: '1 hour ago',
  },
  {
    id: '3',
    actor: 'Carol Davis',
    action: 'opened',
    target: 'Pull Request #42',
    timestamp: '45 minutes ago',
  },
  {
    id: '4',
    actor: 'Dave Wilson',
    action: 'deployed',
    target: 'production',
    timestamp: '30 minutes ago',
  },
];

export const Default: Story = {
  args: {
    items: defaultItems,
  },
  parameters: {
    docs: {
      description: {
        story: 'Basic activity feed with actor, action, target, and timestamps. Falls back to showing the first letter of the actor name as an avatar.',
      },
    },
  },
};

// ─── WithAvatars ──────────────────────────────────────────────────────────────

const avatarUrl = (seed: string) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=c0aede`;

const withAvatarItems: ActivityFeedItem[] = [
  {
    id: '1',
    actor: 'Alice Chen',
    action: 'created',
    target: 'new-feature branch',
    timestamp: '3 hours ago',
    avatar: (
      <img
        src={avatarUrl('AC')}
        alt="Alice Chen"
        className="w-full h-full rounded-full"
      />
    ),
    color: 'primary',
  },
  {
    id: '2',
    actor: 'Bob Smith',
    action: 'reviewed',
    target: 'Pull Request #38',
    timestamp: '2 hours ago',
    avatar: (
      <img
        src={avatarUrl('BS')}
        alt="Bob Smith"
        className="w-full h-full rounded-full"
      />
    ),
    color: 'info',
  },
  {
    id: '3',
    actor: 'Carol Davis',
    action: 'merged',
    target: 'Pull Request #38',
    timestamp: '1 hour ago',
    avatar: (
      <img
        src={avatarUrl('CD')}
        alt="Carol Davis"
        className="w-full h-full rounded-full"
      />
    ),
    color: 'success',
  },
];

export const WithAvatars: Story = {
  args: {
    items: withAvatarItems,
  },
  parameters: {
    docs: {
      description: {
        story: 'Activity feed items with custom avatar images. The avatar node replaces the default initial letter.',
      },
    },
  },
};

// ─── WithContent ──────────────────────────────────────────────────────────────

const withContentItems: ActivityFeedItem[] = [
  {
    id: '1',
    actor: 'Alice Chen',
    action: 'commented on',
    target: 'Issue #15',
    timestamp: '2 hours ago',
    icon: <CommentIcon />,
    color: 'info',
    content: (
      <div className="rounded-lg border border-surface-border p-3 mt-1 text-sm text-text">
        I think we should refactor the auth module before adding OAuth support. The current implementation is tightly coupled to email/password.
      </div>
    ),
  },
  {
    id: '2',
    actor: 'Bob Smith',
    action: 'committed to',
    target: 'feature/auth',
    timestamp: '1 hour ago',
    icon: <GitCommitIcon />,
    color: 'primary',
    content: (
      <div className="rounded-lg border border-surface-border p-3 mt-1">
        <code className="text-xs text-text-secondary font-mono">
          a1b2c3d refactor: extract auth strategy interface
        </code>
      </div>
    ),
  },
  {
    id: '3',
    actor: 'Carol Davis',
    action: 'approved',
    target: 'Pull Request #42',
    timestamp: '30 minutes ago',
    icon: <CheckIcon />,
    color: 'success',
  },
];

export const WithContent: Story = {
  args: {
    items: withContentItems,
  },
  parameters: {
    docs: {
      description: {
        story: 'Feed items with extra content below the action line, such as comments, commit details, or embedded cards.',
      },
    },
  },
};

// ─── NoConnector ──────────────────────────────────────────────────────────────

export const NoConnector: Story = {
  args: {
    items: defaultItems,
    showConnector: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Activity feed without the vertical connector line between items.',
      },
    },
  },
};

// ─── Colors ───────────────────────────────────────────────────────────────────

const colorItems: ActivityFeedItem[] = allColors.map((color, i) => ({
  id: String(i + 1),
  actor: `User ${i + 1}`,
  action: `performed a ${color} action on`,
  target: `Resource #${i + 1}`,
  timestamp: `${i + 1}h ago`,
  color,
  icon: color === 'success' ? <CheckIcon /> : color === 'danger' ? <AlertIcon /> : <GitCommitIcon />,
}));

export const Colors: Story = {
  args: {
    items: colorItems,
  },
  parameters: {
    docs: {
      description: {
        story: 'All five color variants applied to icon dots: primary, success, warning, danger, info.',
      },
    },
  },
};

// ─── Sizes ────────────────────────────────────────────────────────────────────

const sizeItems: ActivityFeedItem[] = [
  {
    id: '1',
    actor: 'Alice',
    action: 'created',
    target: 'Project',
    timestamp: '1h ago',
    icon: <GitCommitIcon />,
    color: 'primary',
  },
  {
    id: '2',
    actor: 'Bob',
    action: 'merged',
    target: 'PR #10',
    timestamp: '30m ago',
    icon: <MergeIcon />,
    color: 'success',
  },
  {
    id: '3',
    actor: 'Carol',
    action: 'deployed to',
    target: 'production',
    timestamp: 'Just now',
    icon: <CheckIcon />,
    color: 'info',
  },
];

export const Sizes: Story = {
  render: () => (
    <div className="flex gap-12">
      {allSizes.map((size) => (
        <div key={size} className="flex-1">
          <p className="text-xs font-medium text-text-secondary mb-3">
            Size: {size}
          </p>
          <ActivityFeed items={sizeItems} size={size} />
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

const mobileItems: ActivityFeedItem[] = [
  {
    id: '1',
    actor: 'Alice Chen',
    action: 'signed up',
    timestamp: 'Jan 1',
    color: 'success',
  },
  {
    id: '2',
    actor: 'Alice Chen',
    action: 'completed onboarding for',
    target: 'My First Project',
    timestamp: 'Jan 2',
    color: 'primary',
  },
  {
    id: '3',
    actor: 'Alice Chen',
    action: 'invited',
    target: 'Bob Smith',
    timestamp: 'Jan 3',
    color: 'info',
  },
  {
    id: '4',
    actor: 'Bob Smith',
    action: 'accepted the invitation',
    timestamp: 'Jan 3',
    color: 'success',
    content: (
      <span className="text-text-secondary text-xs">
        Bob joined as a Contributor
      </span>
    ),
  },
];

export const Mobile: Story = {
  args: {
    items: mobileItems,
    size: 'sm',
  },
  render: (args) => (
    <div className="p-4">
      <ActivityFeed {...args} />
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Activity feed rendered at 375px mobile viewport width with compact sm size.',
      },
    },
  },
};
