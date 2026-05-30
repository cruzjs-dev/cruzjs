import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Sidebar } from './Sidebar';
import type { SidebarGroup } from './Sidebar';

const meta = {
  title: 'Navigation/Sidebar',
  component: Sidebar,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Collapsible vertical navigation sidebar with icon-only mode, grouped items, and nested sections.',
      },
    },
  },
  argTypes: {
    collapsed: { control: 'boolean' },
    activeId: { control: 'text' },
  },
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

// --- Inline SVG icon helpers ---

function DashboardIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}

function ProjectsIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4h12M2 8h12M2 12h12" />
    </svg>
  );
}

function TeamIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="5" r="2.5" />
      <path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" />
    </svg>
  );
}

function ReportsIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12V7M8 12V4M12 12V9" />
    </svg>
  );
}

function AnalyticsIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1,12 5,6 9,9 15,3" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M2.9 2.9l1.4 1.4M11.7 11.7l1.4 1.4M2.9 13.1l1.4-1.4M11.7 4.3l1.4-1.4" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="7" />
      <path d="M5.5 6a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 3.5M8 13v.01" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 10l2.5-7h7L14 10M2 10v3a1 1 0 001 1h10a1 1 0 001-1v-3M2 10h3.5a1 1 0 011 1v.5a1 1 0 001 1h1a1 1 0 001-1V11a1 1 0 011-1H14" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 4l-4 4 4 4" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4l4 4-4 4" />
    </svg>
  );
}

const defaultGroups: SidebarGroup[] = [
  {
    label: 'Navigation',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
      { id: 'projects', label: 'Projects', icon: <ProjectsIcon /> },
      { id: 'team', label: 'Team', icon: <TeamIcon /> },
    ],
  },
  {
    label: 'Insights',
    items: [
      { id: 'reports', label: 'Reports', icon: <ReportsIcon /> },
      { id: 'analytics', label: 'Analytics', icon: <AnalyticsIcon /> },
    ],
  },
  {
    label: 'Support',
    items: [
      { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
      { id: 'help', label: 'Help', icon: <HelpIcon /> },
    ],
  },
];

const SidebarWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="h-[600px] border border-surface-border rounded-xl overflow-hidden bg-surface" style={{ width: 'fit-content' }}>
    {children}
  </div>
);

export const Default: Story = {
  args: {
    groups: defaultGroups,
  },
  render: (args) => (
    <SidebarWrapper>
      <Sidebar {...args} className="w-[240px]" />
    </SidebarWrapper>
  ),
};

export const Collapsed: Story = {
  args: {
    groups: defaultGroups,
    collapsed: true,
  },
  render: (args) => (
    <SidebarWrapper>
      <Sidebar {...args} />
    </SidebarWrapper>
  ),
};

const nestedGroups: SidebarGroup[] = [
  {
    label: 'Navigation',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
      {
        id: 'projects',
        label: 'Projects',
        icon: <ProjectsIcon />,
        children: [
          { id: 'projects-active', label: 'Active' },
          { id: 'projects-archived', label: 'Archived' },
          { id: 'projects-drafts', label: 'Drafts' },
        ],
      },
      {
        id: 'team',
        label: 'Team',
        icon: <TeamIcon />,
        children: [
          { id: 'team-members', label: 'Members' },
          { id: 'team-roles', label: 'Roles' },
        ],
      },
    ],
  },
  {
    label: 'Settings',
    items: [
      { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
    ],
  },
];

export const WithNested: Story = {
  args: {
    groups: nestedGroups,
  },
  render: (args) => (
    <SidebarWrapper>
      <Sidebar {...args} className="w-[240px]" />
    </SidebarWrapper>
  ),
};

const badgeGroups: SidebarGroup[] = [
  {
    label: 'Navigation',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
      { id: 'inbox', label: 'Inbox', icon: <InboxIcon />, badge: 12 },
      { id: 'projects', label: 'Projects', icon: <ProjectsIcon />, badge: 3 },
      { id: 'team', label: 'Team', icon: <TeamIcon />, badge: 'New' },
    ],
  },
];

export const WithBadges: Story = {
  args: {
    groups: badgeGroups,
  },
  render: (args) => (
    <SidebarWrapper>
      <Sidebar {...args} className="w-[240px]" />
    </SidebarWrapper>
  ),
};

export const WithHeaderFooter: Story = {
  args: {
    groups: defaultGroups,
  },
  render: (args) => (
    <SidebarWrapper>
      <Sidebar
        {...args}
        className="w-[240px]"
        header={
          <div className="flex items-center gap-2 px-4 py-4 border-b border-surface-border/50">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white text-sm font-bold">
              C
            </div>
            <span className="text-sm font-semibold text-text">CruzJS</span>
          </div>
        }
        footer={
          <div className="flex items-center gap-2 px-4 py-3 border-t border-surface-border/50">
            <div className="w-8 h-8 rounded-full bg-surface-lighter flex items-center justify-center text-text-muted text-xs font-medium">
              KR
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text truncate">Kerry Ritter</div>
              <div className="text-xs text-text-muted truncate">kerry@example.com</div>
            </div>
          </div>
        }
      />
    </SidebarWrapper>
  ),
};

export const ActiveItem: Story = {
  args: {
    groups: defaultGroups,
    activeId: 'projects',
  },
  render: (args) => (
    <SidebarWrapper>
      <Sidebar {...args} className="w-[240px]" />
    </SidebarWrapper>
  ),
};

export const Interactive: Story = {
  args: {
    groups: defaultGroups,
  },
  render: (args) => {
    const [collapsed, setCollapsed] = useState(false);
    const [activeId, setActiveId] = useState('dashboard');

    return (
      <SidebarWrapper>
        <Sidebar
          {...args}
          collapsed={collapsed}
          activeId={activeId}
          onNavigate={setActiveId}
          className={collapsed ? undefined : 'w-[240px]'}
          header={
            <div className="flex items-center justify-between px-3 py-3 border-b border-surface-border/50">
              {!collapsed && (
                <span className="text-sm font-semibold text-text pl-1">CruzJS</span>
              )}
              <button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:bg-surface-lighter transition-colors"
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <span className="w-4 h-4">
                  {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                </span>
              </button>
            </div>
          }
        />
      </SidebarWrapper>
    );
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  args: {
    groups: defaultGroups,
    activeId: 'dashboard',
  },
  render: (args) => (
    <div className="h-[600px] bg-surface">
      <Sidebar {...args} className="w-[240px]" />
    </div>
  ),
};
