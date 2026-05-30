import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SettingsLayout } from './SettingsLayout';
import type { SettingsNavGroup } from './SettingsLayout';

// Mock useIsMobile to default to desktop
vi.mock('../../hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));

const defaultGroups: SettingsNavGroup[] = [
  {
    label: 'General',
    items: [
      { id: 'profile', label: 'Profile' },
      { id: 'account', label: 'Account' },
    ],
  },
  {
    label: 'Security',
    items: [
      { id: 'password', label: 'Password' },
      { id: '2fa', label: 'Two-Factor Auth', badge: 1 },
    ],
  },
];

// --- Title Rendering -------------------------------------------------------------

describe('SettingsLayout -- title', () => {
  it('renders title', () => {
    render(
      <SettingsLayout groups={defaultGroups} activeId="profile">
        Content
      </SettingsLayout>,
    );
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders custom title', () => {
    render(
      <SettingsLayout groups={defaultGroups} activeId="profile" title="Preferences">
        Content
      </SettingsLayout>,
    );
    expect(screen.getByText('Preferences')).toBeInTheDocument();
  });
});

// --- Nav Items -------------------------------------------------------------------

describe('SettingsLayout -- nav items', () => {
  it('renders nav items', () => {
    render(
      <SettingsLayout groups={defaultGroups} activeId="profile">
        Content
      </SettingsLayout>,
    );
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
    expect(screen.getByText('Two-Factor Auth')).toBeInTheDocument();
  });
});

// --- Active Item -----------------------------------------------------------------

describe('SettingsLayout -- active item', () => {
  it('highlights active item', () => {
    render(
      <SettingsLayout groups={defaultGroups} activeId="profile">
        Content
      </SettingsLayout>,
    );
    const profileButton = screen.getByText('Profile').closest('button');
    expect(profileButton?.className).toContain('bg-primary-subtle');
    expect(profileButton?.className).toContain('text-primary');
  });

  it('does not highlight inactive items', () => {
    render(
      <SettingsLayout groups={defaultGroups} activeId="profile">
        Content
      </SettingsLayout>,
    );
    const accountButton = screen.getByText('Account').closest('button');
    expect(accountButton?.className).toContain('text-text-secondary');
    expect(accountButton?.className).not.toContain('bg-primary-subtle');
  });
});

// --- onNavigate ------------------------------------------------------------------

describe('SettingsLayout -- onNavigate', () => {
  it('calls onNavigate on item click', () => {
    const onNavigate = vi.fn();
    render(
      <SettingsLayout groups={defaultGroups} activeId="profile" onNavigate={onNavigate}>
        Content
      </SettingsLayout>,
    );
    fireEvent.click(screen.getByText('Account'));
    expect(onNavigate).toHaveBeenCalledWith('account');
  });
});

// --- Group Labels ----------------------------------------------------------------

describe('SettingsLayout -- group labels', () => {
  it('renders group labels', () => {
    render(
      <SettingsLayout groups={defaultGroups} activeId="profile">
        Content
      </SettingsLayout>,
    );
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
  });

  it('handles groups without labels', () => {
    const groups: SettingsNavGroup[] = [
      {
        items: [{ id: 'profile', label: 'Profile' }],
      },
    ];
    render(
      <SettingsLayout groups={groups} activeId="profile">
        Content
      </SettingsLayout>,
    );
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });
});

// --- Children Content ------------------------------------------------------------

describe('SettingsLayout -- children', () => {
  it('renders children content', () => {
    render(
      <SettingsLayout groups={defaultGroups} activeId="profile">
        <div data-testid="settings-content">My Settings Page</div>
      </SettingsLayout>,
    );
    expect(screen.getByTestId('settings-content')).toBeInTheDocument();
    expect(screen.getByText('My Settings Page')).toBeInTheDocument();
  });
});

// --- Badges ----------------------------------------------------------------------

describe('SettingsLayout -- badges', () => {
  it('renders badges', () => {
    render(
      <SettingsLayout groups={defaultGroups} activeId="profile">
        Content
      </SettingsLayout>,
    );
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders string badges', () => {
    const groups: SettingsNavGroup[] = [
      {
        items: [{ id: 'plan', label: 'Plan', badge: 'Pro' }],
      },
    ];
    render(
      <SettingsLayout groups={groups} activeId="plan">
        Content
      </SettingsLayout>,
    );
    expect(screen.getByText('Pro')).toBeInTheDocument();
  });
});

// --- Back Link -------------------------------------------------------------------

describe('SettingsLayout -- back link', () => {
  it('renders back link', () => {
    render(
      <SettingsLayout
        groups={defaultGroups}
        activeId="profile"
        backHref="/dashboard"
        backLabel="Dashboard"
      >
        Content
      </SettingsLayout>,
    );
    const link = screen.getByText('Dashboard');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/dashboard');
  });

  it('renders default back label', () => {
    render(
      <SettingsLayout groups={defaultGroups} activeId="profile" backHref="/home">
        Content
      </SettingsLayout>,
    );
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('does not render back link when backHref is not provided', () => {
    const { container } = render(
      <SettingsLayout groups={defaultGroups} activeId="profile">
        Content
      </SettingsLayout>,
    );
    expect(container.querySelector('a')).toBeNull();
  });
});

// --- Disabled Items --------------------------------------------------------------

describe('SettingsLayout -- disabled items', () => {
  it('disabled items do not trigger navigation', () => {
    const onNavigate = vi.fn();
    const groups: SettingsNavGroup[] = [
      {
        items: [
          { id: 'profile', label: 'Profile' },
          { id: 'billing', label: 'Billing', disabled: true },
        ],
      },
    ];
    render(
      <SettingsLayout groups={groups} activeId="profile" onNavigate={onNavigate}>
        Content
      </SettingsLayout>,
    );
    fireEvent.click(screen.getByText('Billing'));
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('disabled items have opacity styling', () => {
    const groups: SettingsNavGroup[] = [
      {
        items: [{ id: 'billing', label: 'Billing', disabled: true }],
      },
    ];
    render(
      <SettingsLayout groups={groups} activeId="profile">
        Content
      </SettingsLayout>,
    );
    const button = screen.getByText('Billing').closest('button');
    expect(button?.className).toContain('opacity-50');
    expect(button?.className).toContain('cursor-not-allowed');
  });
});
