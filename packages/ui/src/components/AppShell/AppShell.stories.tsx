import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { AppShell } from './AppShell';

// --- Icon helpers for stories --------------------------------------------------------

const HomeIcon: React.FC = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const InboxIcon: React.FC = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);

const SettingsIcon: React.FC = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const UsersIcon: React.FC = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ChevronRightIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

// --- Mock layout pieces for stories --------------------------------------------------

const MockHeader: React.FC<{ title?: string }> = ({ title = 'My App' }) => (
  <div className="flex items-center justify-between px-4 h-full">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-surface text-sm font-bold">
        A
      </div>
      <span className="text-sm font-semibold text-text">{title}</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-full bg-surface-lighter" />
    </div>
  </div>
);

const MockSidebar: React.FC<{ collapsed?: boolean }> = ({ collapsed = false }) => {
  const navItems = [
    { icon: <HomeIcon />, label: 'Dashboard', active: true },
    { icon: <InboxIcon />, label: 'Inbox' },
    { icon: <UsersIcon />, label: 'Team' },
    { icon: <SettingsIcon />, label: 'Settings' },
  ];

  return (
    <nav className="flex flex-col gap-1 p-3">
      {navItems.map((item) => (
        <button
          key={item.label}
          type="button"
          className={[
            'flex items-center gap-3 rounded-lg text-sm transition-colors duration-150',
            collapsed ? 'justify-center p-2' : 'px-3 py-2',
            item.active
              ? 'bg-primary-subtle text-primary font-medium'
              : 'text-text-secondary hover:text-text hover:bg-surface-lighter',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className="shrink-0">{item.icon}</span>
          {!collapsed && <span>{item.label}</span>}
        </button>
      ))}
    </nav>
  );
};

const MockFooter: React.FC = () => (
  <div className="flex items-center justify-between px-6 py-3 text-xs text-text-muted">
    <span>2026 My App</span>
    <div className="flex gap-4">
      <a href="#" className="hover:text-text-secondary">Privacy</a>
      <a href="#" className="hover:text-text-secondary">Terms</a>
      <a href="#" className="hover:text-text-secondary">Help</a>
    </div>
  </div>
);

const MockMainContent: React.FC<{ long?: boolean }> = ({ long = false }) => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-text">Dashboard</h1>
      <p className="text-sm text-text-secondary mt-1">Welcome back, here is what is happening today.</p>
    </div>
    <div className="grid grid-cols-3 gap-4">
      {['Revenue', 'Users', 'Orders'].map((label) => (
        <div key={label} className="rounded-xl border border-surface-border bg-surface p-5">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-text mt-1">1,234</p>
        </div>
      ))}
    </div>
    {long && (
      <div className="space-y-4">
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} className="rounded-lg border border-surface-border bg-surface p-4">
            <p className="text-sm text-text">Content block {i + 1} - scrollable content to demonstrate fixed layout behavior.</p>
          </div>
        ))}
      </div>
    )}
  </div>
);

// --- Breadcrumbs helper for FullExample ----------------------------------------------

const MockBreadcrumbs: React.FC = () => (
  <div className="flex items-center gap-1 text-sm text-text-muted px-4 h-full">
    <span className="hover:text-text-secondary cursor-pointer">Home</span>
    <ChevronRightIcon />
    <span className="hover:text-text-secondary cursor-pointer">Projects</span>
    <ChevronRightIcon />
    <span className="text-text font-medium">Dashboard</span>
  </div>
);

// --- Meta ----------------------------------------------------------------------------

const meta = {
  title: 'Layout/AppShell',
  component: AppShell,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Full app layout compositor with sidebar, header, main content, and footer regions. CSS Grid based with support for fixed positioning, collapsible sidebars, and responsive mobile layouts.',
      },
    },
  },
  argTypes: {
    sidebarWidth: { control: { type: 'number' } },
    sidebarCollapsed: { control: 'boolean' },
    collapsedWidth: { control: { type: 'number' } },
    headerHeight: { control: { type: 'number' } },
    sidebarPosition: { control: { type: 'select' }, options: ['left', 'right'] },
    padding: { control: { type: 'select' }, options: ['none', 'sm', 'md', 'lg'] },
    fixed: { control: 'boolean' },
  },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

// --- Default -------------------------------------------------------------------------

export const Default: Story = {
  render: (args) => (
    <AppShell
      {...args}
      header={<MockHeader />}
      sidebar={<MockSidebar />}
    >
      <MockMainContent />
    </AppShell>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Default layout with header, sidebar, and main content area.',
      },
    },
  },
};

// --- WithFooter ----------------------------------------------------------------------

export const WithFooter: Story = {
  render: () => (
    <AppShell
      header={<MockHeader />}
      sidebar={<MockSidebar />}
      footer={<MockFooter />}
    >
      <MockMainContent />
    </AppShell>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Layout with header, sidebar, main content, and footer.',
      },
    },
  },
};

// --- CollapsedSidebar ----------------------------------------------------------------

export const CollapsedSidebar: Story = {
  render: () => (
    <AppShell
      header={<MockHeader />}
      sidebar={<MockSidebar collapsed />}
      sidebarCollapsed
    >
      <MockMainContent />
    </AppShell>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Sidebar in collapsed state showing icon-only width (64px default).',
      },
    },
  },
};

// --- NoSidebar -----------------------------------------------------------------------

export const NoSidebar: Story = {
  render: () => (
    <AppShell header={<MockHeader />}>
      <MockMainContent />
    </AppShell>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Layout without a sidebar. Main content spans the full width below the header.',
      },
    },
  },
};

// --- RightSidebar --------------------------------------------------------------------

export const RightSidebar: Story = {
  render: () => (
    <AppShell
      header={<MockHeader />}
      sidebar={<MockSidebar />}
      sidebarPosition="right"
    >
      <MockMainContent />
    </AppShell>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Sidebar positioned on the right side of the layout.',
      },
    },
  },
};

// --- Fixed ---------------------------------------------------------------------------

export const Fixed: Story = {
  render: () => (
    <AppShell
      header={<MockHeader />}
      sidebar={<MockSidebar />}
      fixed
    >
      <MockMainContent long />
    </AppShell>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Fixed header and sidebar with scrollable main content. Scroll the main area to see the header and sidebar stay in place.',
      },
    },
  },
};

// --- FullExample ---------------------------------------------------------------------

export const FullExample: Story = {
  render: () => (
    <AppShell
      header={
        <div className="flex items-center h-full border-b border-surface-border">
          <div className="flex items-center gap-3 px-4 shrink-0" style={{ width: 260 }}>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-surface text-sm font-bold">
              P
            </div>
            <span className="text-sm font-semibold text-text">ProjectHub</span>
          </div>
          <MockBreadcrumbs />
          <div className="ml-auto flex items-center gap-2 px-4">
            <div className="w-8 h-8 rounded-full bg-surface-lighter" />
          </div>
        </div>
      }
      sidebar={
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto">
            <MockSidebar />
            <div className="px-3 mt-4">
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider px-3 mb-2">
                Projects
              </p>
              {['Website Redesign', 'Mobile App', 'API v3', 'Analytics'].map((project) => (
                <button
                  key={project}
                  type="button"
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-text-secondary hover:text-text hover:bg-surface-lighter rounded-lg transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-primary/60 shrink-0" />
                  <span className="truncate">{project}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-surface-border p-3">
            <div className="flex items-center gap-3 px-2">
              <div className="w-8 h-8 rounded-full bg-surface-lighter shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text truncate">John Doe</p>
                <p className="text-xs text-text-muted truncate">john@example.com</p>
              </div>
            </div>
          </div>
        </div>
      }
      footer={<MockFooter />}
      fixed
    >
      <MockMainContent long />
    </AppShell>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Realistic app layout with nav items in sidebar, breadcrumbs in header, content cards in main, and a footer.',
      },
    },
  },
};

// --- Mobile --------------------------------------------------------------------------

export const Mobile: Story = {
  render: () => (
    <AppShell
      header={<MockHeader />}
      sidebar={<MockSidebar />}
    >
      <MockMainContent />
    </AppShell>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    docs: {
      description: {
        story: 'Mobile layout at 375px. Sidebar is hidden; header and main content span full width.',
      },
    },
  },
};
