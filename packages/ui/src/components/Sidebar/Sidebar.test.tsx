import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Sidebar, type SidebarGroup, type SidebarItem } from './Sidebar';

const makeIcon = (label: string) => <span data-testid={`icon-${label}`} />;

const basicGroups: SidebarGroup[] = [
  {
    label: 'Main',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: makeIcon('dashboard') },
      { id: 'projects', label: 'Projects', icon: makeIcon('projects') },
    ],
  },
  {
    label: 'Settings',
    items: [
      { id: 'general', label: 'General' },
      { id: 'billing', label: 'Billing' },
    ],
  },
];

describe('Sidebar', () => {
  it('renders nav element', () => {
    render(<Sidebar groups={basicGroups} />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('renders group labels', () => {
    render(<Sidebar groups={basicGroups} />);
    expect(screen.getByText('Main')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders nav items', () => {
    render(<Sidebar groups={basicGroups} />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Billing')).toBeInTheDocument();
  });

  it('highlights active item', () => {
    render(<Sidebar groups={basicGroups} activeId="projects" />);
    const activeItem = screen.getByText('Projects').closest('button');
    expect(activeItem?.className).toContain('bg-primary-subtle');
    expect(activeItem?.className).toContain('text-primary');
    expect(activeItem?.className).toContain('font-medium');
  });

  it('calls onNavigate on item click', () => {
    const onNavigate = vi.fn();
    render(<Sidebar groups={basicGroups} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('Dashboard'));
    expect(onNavigate).toHaveBeenCalledWith('dashboard');
  });

  it('hides labels when collapsed', () => {
    render(<Sidebar groups={basicGroups} collapsed />);
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Projects')).not.toBeInTheDocument();
    // Group labels should also be hidden
    expect(screen.queryByText('Main')).not.toBeInTheDocument();
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    // Icons should still be present
    expect(screen.getByTestId('icon-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('icon-projects')).toBeInTheDocument();
  });

  it('renders badges', () => {
    const groups: SidebarGroup[] = [
      {
        items: [
          { id: 'inbox', label: 'Inbox', badge: 5 },
          { id: 'alerts', label: 'Alerts', badge: 'New' },
        ],
      },
    ];
    render(<Sidebar groups={groups} />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('renders nested items', () => {
    const groups: SidebarGroup[] = [
      {
        items: [
          {
            id: 'settings',
            label: 'Settings',
            children: [
              { id: 'profile', label: 'Profile' },
              { id: 'security', label: 'Security' },
            ],
          },
        ],
      },
    ];
    render(<Sidebar groups={groups} />);
    // Parent is rendered
    expect(screen.getByText('Settings')).toBeInTheDocument();
    // Children are NOT visible initially (collapsed section)
    expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    expect(screen.queryByText('Security')).not.toBeInTheDocument();
  });

  it('toggles nested item expansion', () => {
    const groups: SidebarGroup[] = [
      {
        items: [
          {
            id: 'settings',
            label: 'Settings',
            children: [
              { id: 'profile', label: 'Profile' },
              { id: 'security', label: 'Security' },
            ],
          },
        ],
      },
    ];
    render(<Sidebar groups={groups} />);

    // Click parent to expand
    fireEvent.click(screen.getByText('Settings'));
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();

    // Click parent again to collapse
    fireEvent.click(screen.getByText('Settings'));
    expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    expect(screen.queryByText('Security')).not.toBeInTheDocument();
  });

  it('renders header and footer', () => {
    render(
      <Sidebar
        groups={basicGroups}
        header={<div data-testid="sidebar-header">Logo</div>}
        footer={<div data-testid="sidebar-footer">User Menu</div>}
      />,
    );
    expect(screen.getByTestId('sidebar-header')).toBeInTheDocument();
    expect(screen.getByText('Logo')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-footer')).toBeInTheDocument();
    expect(screen.getByText('User Menu')).toBeInTheDocument();
  });

  it('disabled items do not trigger navigation', () => {
    const onNavigate = vi.fn();
    const onClick = vi.fn();
    const groups: SidebarGroup[] = [
      {
        items: [
          { id: 'disabled-item', label: 'Disabled', disabled: true, onClick },
        ],
      },
    ];
    render(<Sidebar groups={groups} onNavigate={onNavigate} />);
    const button = screen.getByText('Disabled').closest('button');
    // Button should be disabled
    expect(button).toBeDisabled();
    // Even if we force a click, handlers should not fire
    fireEvent.click(button!);
    expect(onNavigate).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('sets collapsed width class', () => {
    render(<Sidebar groups={basicGroups} collapsed />);
    const nav = screen.getByRole('navigation');
    expect(nav.className).toContain('w-[64px]');
  });

  it('renders dividers between groups', () => {
    render(<Sidebar groups={basicGroups} />);
    const separators = screen.getAllByRole('separator');
    expect(separators.length).toBeGreaterThanOrEqual(1);
  });

  it('hides badges when collapsed', () => {
    const groups: SidebarGroup[] = [
      {
        items: [
          { id: 'inbox', label: 'Inbox', badge: 5, icon: makeIcon('inbox') },
        ],
      },
    ];
    render(<Sidebar groups={groups} collapsed />);
    expect(screen.queryByText('5')).not.toBeInTheDocument();
  });

  it('uses renderLink for items with href', () => {
    const renderLink = vi.fn(({ href, children, className, onClick }) => (
      <a href={href} className={className} onClick={onClick} data-testid="custom-link">
        {children}
      </a>
    ));
    const groups: SidebarGroup[] = [
      {
        items: [
          { id: 'home', label: 'Home', href: '/home' },
        ],
      },
    ];
    render(<Sidebar groups={groups} renderLink={renderLink} />);
    expect(renderLink).toHaveBeenCalled();
    expect(screen.getByTestId('custom-link')).toBeInTheDocument();
  });

  it('renders anchor for items with href when no renderLink provided', () => {
    const groups: SidebarGroup[] = [
      {
        items: [
          { id: 'home', label: 'Home', href: '/home' },
        ],
      },
    ];
    const { container } = render(<Sidebar groups={groups} />);
    const anchor = container.querySelector('a[href="/home"]');
    expect(anchor).toBeInTheDocument();
  });

  it('shows title tooltip when collapsed', () => {
    const groups: SidebarGroup[] = [
      {
        items: [
          { id: 'home', label: 'Home', icon: makeIcon('home') },
        ],
      },
    ];
    render(<Sidebar groups={groups} collapsed />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title', 'Home');
  });
});
