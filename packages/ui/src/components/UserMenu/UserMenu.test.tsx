import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserMenu, type UserMenuGroup } from './UserMenu';

function mockMatchMedia(matches = false) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

const defaultGroups: UserMenuGroup[] = [
  {
    items: [
      { label: 'Settings', onClick: vi.fn() },
      { label: 'Profile', onClick: vi.fn() },
    ],
  },
  {
    items: [
      { label: 'Sign out', destructive: true, onClick: vi.fn() },
    ],
  },
];

describe('UserMenu', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    vi.clearAllMocks();
  });

  it('renders avatar trigger button', () => {
    render(
      <UserMenu name="Jane Doe" email="jane@example.com" groups={defaultGroups} />,
    );
    const trigger = screen.getByRole('button');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('opens menu on click', () => {
    render(
      <UserMenu name="Jane Doe" email="jane@example.com" groups={defaultGroups} />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    render(
      <UserMenu name="Jane Doe" email="jane@example.com" groups={defaultGroups} />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes on click outside', () => {
    render(
      <div>
        <span data-testid="outside">Outside</span>
        <UserMenu name="Jane Doe" email="jane@example.com" groups={defaultGroups} />
      </div>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('renders user name and email in dropdown', () => {
    render(
      <UserMenu name="Jane Doe" email="jane@example.com" groups={defaultGroups} />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('renders menu items', () => {
    render(
      <UserMenu name="Jane Doe" groups={defaultGroups} />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Sign out')).toBeInTheDocument();
  });

  it('calls onClick on item click', () => {
    const handler = vi.fn();
    const groups: UserMenuGroup[] = [
      { items: [{ label: 'Settings', onClick: handler }] },
    ];
    render(
      <UserMenu name="Jane Doe" groups={groups} />,
    );
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Settings'));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('renders destructive items with correct styling intent', () => {
    render(
      <UserMenu name="Jane Doe" groups={defaultGroups} />,
    );
    fireEvent.click(screen.getByRole('button'));
    const signOutItem = screen.getByText('Sign out').closest('[role="menuitem"]');
    expect(signOutItem?.className).toContain('text-danger');
  });

  it('has correct aria attributes (aria-haspopup, aria-expanded, role=menu)', () => {
    render(
      <UserMenu name="Jane Doe" groups={defaultGroups} />,
    );
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('renders group labels', () => {
    const groups: UserMenuGroup[] = [
      { label: 'Account', items: [{ label: 'Settings' }] },
      { label: 'Support', items: [{ label: 'Help' }] },
    ];
    render(
      <UserMenu name="Jane Doe" groups={groups} />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getByText('Support')).toBeInTheDocument();
  });
});
