import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationTray } from './NotificationTray';
import type { NotificationTrayItem } from './NotificationTray';

// ─── matchMedia mock ────────────────────────────────────────────────────────

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

// ─── Fixtures ───────────────────────────────────────────────────────────────

const sampleItems: NotificationTrayItem[] = [
  {
    id: '1',
    title: 'New deployment',
    message: 'Production deploy completed successfully.',
    timestamp: '2 min ago',
    read: false,
  },
  {
    id: '2',
    title: 'Invitation accepted',
    message: 'Alice joined your organization.',
    timestamp: '1 hour ago',
    read: true,
  },
  {
    id: '3',
    title: 'Billing alert',
    timestamp: '3 hours ago',
    read: false,
  },
];

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('NotificationTray', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  // ─── Bell icon rendering ────────────────────────────────────────────

  describe('bell icon', () => {
    it('renders the bell icon trigger button', () => {
      render(<NotificationTray items={[]} />);
      expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    });

    it('has aria-haspopup on the trigger', () => {
      render(<NotificationTray items={[]} />);
      expect(screen.getByRole('button', { name: 'Notifications' })).toHaveAttribute(
        'aria-haspopup',
        'dialog',
      );
    });

    it('sets aria-expanded to false when closed', () => {
      render(<NotificationTray items={[]} />);
      expect(screen.getByRole('button', { name: 'Notifications' })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    });
  });

  // ─── Unread badge ─────────────────────────────────────────────────

  describe('unread badge', () => {
    it('shows unread badge when unreadCount is provided', () => {
      render(<NotificationTray items={sampleItems} unreadCount={5} />);
      expect(screen.getByTestId('unread-badge')).toHaveTextContent('5');
    });

    it('auto-calculates unread count from items when unreadCount is not provided', () => {
      render(<NotificationTray items={sampleItems} />);
      // Items 1 and 3 are unread
      expect(screen.getByTestId('unread-badge')).toHaveTextContent('2');
    });

    it('does not show badge when unreadCount is 0', () => {
      render(<NotificationTray items={sampleItems} unreadCount={0} />);
      expect(screen.queryByTestId('unread-badge')).not.toBeInTheDocument();
    });

    it('caps the badge at 99+', () => {
      render(<NotificationTray items={[]} unreadCount={150} />);
      expect(screen.getByTestId('unread-badge')).toHaveTextContent('99+');
    });
  });

  // ─── Panel open/close ─────────────────────────────────────────────

  describe('panel open/close', () => {
    it('opens panel on click', () => {
      render(<NotificationTray items={sampleItems} />);
      fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    it('sets aria-expanded to true when open', () => {
      render(<NotificationTray items={sampleItems} />);
      const trigger = screen.getByRole('button', { name: 'Notifications' });
      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('toggles panel on repeated clicks', () => {
      render(<NotificationTray items={sampleItems} />);
      const trigger = screen.getByRole('button', { name: 'Notifications' });
      fireEvent.click(trigger);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      fireEvent.click(trigger);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  // ─── Renders items ────────────────────────────────────────────────

  describe('items rendering', () => {
    it('renders all notification items', () => {
      render(<NotificationTray items={sampleItems} />);
      fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
      expect(screen.getByText('New deployment')).toBeInTheDocument();
      expect(screen.getByText('Invitation accepted')).toBeInTheDocument();
      expect(screen.getByText('Billing alert')).toBeInTheDocument();
    });

    it('renders item messages when provided', () => {
      render(<NotificationTray items={sampleItems} />);
      fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
      expect(screen.getByText('Production deploy completed successfully.')).toBeInTheDocument();
      expect(screen.getByText('Alice joined your organization.')).toBeInTheDocument();
    });

    it('renders timestamps', () => {
      render(<NotificationTray items={sampleItems} />);
      fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
      expect(screen.getByText('2 min ago')).toBeInTheDocument();
      expect(screen.getByText('1 hour ago')).toBeInTheDocument();
      expect(screen.getByText('3 hours ago')).toBeInTheDocument();
    });

    it('renders custom icons when provided', () => {
      const itemsWithIcon: NotificationTrayItem[] = [
        {
          id: '1',
          title: 'Custom icon',
          timestamp: 'now',
          icon: <span data-testid="custom-icon">!</span>,
        },
      ];
      render(<NotificationTray items={itemsWithIcon} />);
      fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });
  });

  // ─── Unread highlight ─────────────────────────────────────────────

  describe('unread highlight', () => {
    it('marks unread items with data-unread attribute', () => {
      render(<NotificationTray items={sampleItems} />);
      fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));

      const unreadItem = screen.getByTestId('notification-item-1');
      expect(unreadItem).toHaveAttribute('data-unread', 'true');

      const readItem = screen.getByTestId('notification-item-2');
      expect(readItem).not.toHaveAttribute('data-unread');
    });

    it('shows unread dot for unread items', () => {
      render(<NotificationTray items={sampleItems} />);
      fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));

      const unreadItem = screen.getByTestId('notification-item-1');
      const dot = unreadItem.querySelector('[aria-label="Unread"]');
      expect(dot).toBeInTheDocument();

      const readItem = screen.getByTestId('notification-item-2');
      const noDot = readItem.querySelector('[aria-label="Unread"]');
      expect(noDot).not.toBeInTheDocument();
    });
  });

  // ─── Mark all read ────────────────────────────────────────────────

  describe('mark all read', () => {
    it('shows "Mark all read" button when handler is provided and unread items exist', () => {
      const onMarkAllRead = vi.fn();
      render(
        <NotificationTray items={sampleItems} onMarkAllRead={onMarkAllRead} />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
      expect(screen.getByText('Mark all read')).toBeInTheDocument();
    });

    it('calls onMarkAllRead when clicked', async () => {
      const user = userEvent.setup();
      const onMarkAllRead = vi.fn();
      render(
        <NotificationTray items={sampleItems} onMarkAllRead={onMarkAllRead} />,
      );
      await user.click(screen.getByRole('button', { name: 'Notifications' }));
      await user.click(screen.getByText('Mark all read'));
      expect(onMarkAllRead).toHaveBeenCalledTimes(1);
    });

    it('does not show "Mark all read" when all items are read', () => {
      const allRead = sampleItems.map((item) => ({ ...item, read: true }));
      render(
        <NotificationTray items={allRead} onMarkAllRead={vi.fn()} />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
      expect(screen.queryByText('Mark all read')).not.toBeInTheDocument();
    });

    it('does not show "Mark all read" when no handler is provided', () => {
      render(<NotificationTray items={sampleItems} />);
      fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
      expect(screen.queryByText('Mark all read')).not.toBeInTheDocument();
    });
  });

  // ─── Item click ───────────────────────────────────────────────────

  describe('item click', () => {
    it('calls onItemClick with the item id', async () => {
      const user = userEvent.setup();
      const onItemClick = vi.fn();
      render(
        <NotificationTray items={sampleItems} onItemClick={onItemClick} />,
      );
      await user.click(screen.getByRole('button', { name: 'Notifications' }));
      await user.click(screen.getByTestId('notification-item-1'));
      expect(onItemClick).toHaveBeenCalledWith('1');
    });

    it('calls the item onClick handler', async () => {
      const user = userEvent.setup();
      const itemOnClick = vi.fn();
      const itemsWithClick: NotificationTrayItem[] = [
        {
          id: '1',
          title: 'Clickable',
          timestamp: 'now',
          onClick: itemOnClick,
        },
      ];
      render(<NotificationTray items={itemsWithClick} />);
      await user.click(screen.getByRole('button', { name: 'Notifications' }));
      await user.click(screen.getByTestId('notification-item-1'));
      expect(itemOnClick).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Empty state ──────────────────────────────────────────────────

  describe('empty state', () => {
    it('shows default empty message when no items', () => {
      render(<NotificationTray items={[]} />);
      fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
      expect(screen.getByText('No notifications')).toBeInTheDocument();
    });

    it('shows custom empty message', () => {
      render(<NotificationTray items={[]} emptyMessage="All caught up!" />);
      fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
      expect(screen.getByText('All caught up!')).toBeInTheDocument();
    });
  });

  // ─── Close on click outside ───────────────────────────────────────

  describe('close on click outside', () => {
    it('closes the panel when clicking outside', () => {
      render(
        <div>
          <NotificationTray items={sampleItems} />
          <button>Outside</button>
        </div>,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      fireEvent.mouseDown(screen.getByText('Outside'));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  // ─── Escape closes ────────────────────────────────────────────────

  describe('escape closes', () => {
    it('closes the panel on Escape key', () => {
      render(<NotificationTray items={sampleItems} />);
      fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('returns focus to the trigger after Escape', () => {
      render(<NotificationTray items={sampleItems} />);
      const trigger = screen.getByRole('button', { name: 'Notifications' });
      fireEvent.click(trigger);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(document.activeElement).toBe(trigger);
    });
  });

  // ─── Ref forwarding ───────────────────────────────────────────────

  describe('ref forwarding', () => {
    it('forwards ref to the root element', () => {
      const ref = { current: null as HTMLDivElement | null };
      render(<NotificationTray ref={ref} items={[]} />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  // ─── Size variants ────────────────────────────────────────────────

  describe('size variants', () => {
    it('renders with sm size', () => {
      render(<NotificationTray items={[]} size="sm" />);
      expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    });

    it('renders with lg size', () => {
      render(<NotificationTray items={[]} size="lg" />);
      expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    });
  });

  // ─── Mobile bottom sheet ──────────────────────────────────────────

  describe('mobile bottom sheet', () => {
    it('renders as bottom sheet on mobile', () => {
      mockMatchMedia(true);
      render(<NotificationTray items={sampleItems} />);
      fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      // Bottom sheet has a drag handle
      const dialog = screen.getByRole('dialog');
      expect(dialog.closest('.fixed')).not.toBeNull();
    });
  });
});
