import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Notification,
  NotificationProvider,
  useNotifications,
  resetIdCounter,
} from './Notification';
import type { NotificationVariant } from './Notification';

// ─── Helper: Consumer that exposes the imperative API ──────────────────────

function TestConsumer({
  onReady,
}: {
  onReady: (api: ReturnType<typeof useNotifications>) => void;
}) {
  const api = useNotifications();
  // Expose the API on mount
  React.useEffect(() => {
    onReady(api);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

import React from 'react';

// Reset counter between tests so IDs are predictable
beforeEach(() => {
  resetIdCounter();
});

// ─── Standalone Notification ───────────────────────────────────────────────

describe('Notification -- rendering', () => {
  it('renders the title text', () => {
    render(<Notification title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders the message text', () => {
    render(<Notification title="Title" message="Description body" />);
    expect(screen.getByText('Description body')).toBeInTheDocument();
  });

  it('renders both title and message together', () => {
    render(<Notification title="Heading" message="Body content" />);
    expect(screen.getByText('Heading')).toBeInTheDocument();
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });
});

// ─── Variants ──────────────────────────────────────────────────────────────

describe('Notification -- variants', () => {
  it.each<NotificationVariant>(['info', 'success', 'warning', 'error'])(
    'renders %s variant without crashing',
    (variant) => {
      const { container } = render(<Notification title="Test" variant={variant} />);
      expect(container.firstChild).toBeInTheDocument();
    },
  );

  it.each<NotificationVariant>(['info', 'success', 'warning', 'error'])(
    'renders a default icon for %s variant',
    (variant) => {
      const { container } = render(<Notification title="Test" variant={variant} />);
      const svgs = container.querySelectorAll('svg[aria-hidden="true"]');
      expect(svgs.length).toBeGreaterThanOrEqual(1);
    },
  );

  it('renders custom icon when provided', () => {
    render(
      <Notification title="Custom" icon={<span data-testid="custom-icon">*</span>} />,
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });
});

// ─── ARIA roles ────────────────────────────────────────────────────────────

describe('Notification -- aria roles', () => {
  it('has role="alert"', () => {
    render(<Notification title="Alert test" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('has aria-live="polite"', () => {
    render(<Notification title="Live region" />);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'polite');
  });
});

// ─── Close button ──────────────────────────────────────────────────────────

describe('Notification -- close button', () => {
  it('renders a close button when closable (default)', () => {
    render(<Notification title="Closeable" />);
    expect(screen.getByRole('button', { name: 'Close notification' })).toBeInTheDocument();
  });

  it('does not render close button when closable is false', () => {
    render(<Notification title="Not closeable" closable={false} />);
    expect(screen.queryByRole('button', { name: 'Close notification' })).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(<Notification title="Closeable" onClose={handleClose} />);
    const closeBtn = screen.getByRole('button', { name: 'Close notification' });
    await user.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('close button has accessible label', () => {
    render(<Notification title="Accessible" />);
    const closeBtn = screen.getByRole('button', { name: 'Close notification' });
    expect(closeBtn).toHaveAttribute('aria-label', 'Close notification');
  });
});

// ─── Action button ─────────────────────────────────────────────────────────

describe('Notification -- action button', () => {
  it('renders action button with correct label', () => {
    const action = { label: 'Undo', onClick: vi.fn() };
    render(<Notification title="With action" action={action} />);
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
  });

  it('calls action onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleAction = vi.fn();
    const action = { label: 'Retry', onClick: handleAction };
    render(<Notification title="Retry" action={action} />);
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('does not render action button when no action provided', () => {
    render(<Notification title="No action" />);
    // Only the close button should be present
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAttribute('aria-label', 'Close notification');
  });
});

// ─── Ref forwarding ────────────────────────────────────────────────────────

describe('Notification -- ref forwarding', () => {
  it('forwards ref to the root element', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<Notification ref={ref} title="Ref test" />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current?.getAttribute('role')).toBe('alert');
  });
});

// ─── Provider + Hook ───────────────────────────────────────────────────────

describe('NotificationProvider + useNotifications', () => {
  it('shows a notification via the imperative API', () => {
    let api: ReturnType<typeof useNotifications>;

    render(
      <NotificationProvider>
        <TestConsumer onReady={(a) => { api = a; }} />
      </NotificationProvider>,
    );

    act(() => {
      api.show({ title: 'Hello World' });
    });

    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('returns a string ID from show()', () => {
    let api: ReturnType<typeof useNotifications>;
    let returnedId: string;

    render(
      <NotificationProvider>
        <TestConsumer onReady={(a) => { api = a; }} />
      </NotificationProvider>,
    );

    act(() => {
      returnedId = api.show({ title: 'ID test' });
    });

    expect(typeof returnedId!).toBe('string');
    expect(returnedId!.length).toBeGreaterThan(0);
  });

  it('closes a notification by ID', () => {
    let api: ReturnType<typeof useNotifications>;

    render(
      <NotificationProvider>
        <TestConsumer onReady={(a) => { api = a; }} />
      </NotificationProvider>,
    );

    let id: string;
    act(() => {
      id = api.show({ title: 'Will close' });
    });

    expect(screen.getByText('Will close')).toBeInTheDocument();

    act(() => {
      api.close(id!);
    });

    expect(screen.queryByText('Will close')).not.toBeInTheDocument();
  });

  it('closes all notifications', () => {
    let api: ReturnType<typeof useNotifications>;

    render(
      <NotificationProvider>
        <TestConsumer onReady={(a) => { api = a; }} />
      </NotificationProvider>,
    );

    act(() => {
      api.show({ title: 'First' });
      api.show({ title: 'Second' });
      api.show({ title: 'Third' });
    });

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText('Third')).toBeInTheDocument();

    act(() => {
      api.closeAll();
    });

    expect(screen.queryByText('First')).not.toBeInTheDocument();
    expect(screen.queryByText('Second')).not.toBeInTheDocument();
    expect(screen.queryByText('Third')).not.toBeInTheDocument();
  });

  it('limits visible notifications to maxVisible', () => {
    let api: ReturnType<typeof useNotifications>;

    render(
      <NotificationProvider maxVisible={2}>
        <TestConsumer onReady={(a) => { api = a; }} />
      </NotificationProvider>,
    );

    act(() => {
      api.show({ title: 'Notification 1' });
      api.show({ title: 'Notification 2' });
      api.show({ title: 'Notification 3' });
    });

    // Only the last 2 should be visible
    expect(screen.queryByText('Notification 1')).not.toBeInTheDocument();
    expect(screen.getByText('Notification 2')).toBeInTheDocument();
    expect(screen.getByText('Notification 3')).toBeInTheDocument();
  });
});

// ─── Auto-dismiss ──────────────────────────────────────────────────────────

describe('Notification -- auto-dismiss', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('auto-dismisses after the specified duration', () => {
    let api: ReturnType<typeof useNotifications>;

    render(
      <NotificationProvider>
        <TestConsumer onReady={(a) => { api = a; }} />
      </NotificationProvider>,
    );

    act(() => {
      api.show({ title: 'Auto dismiss', duration: 3000 });
    });

    expect(screen.getByText('Auto dismiss')).toBeInTheDocument();

    // Advance past the duration
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Allow the exit animation to complete (300ms)
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.queryByText('Auto dismiss')).not.toBeInTheDocument();
  });

  it('does not auto-dismiss when duration is 0', () => {
    let api: ReturnType<typeof useNotifications>;

    render(
      <NotificationProvider>
        <TestConsumer onReady={(a) => { api = a; }} />
      </NotificationProvider>,
    );

    act(() => {
      api.show({ title: 'Persistent', duration: 0 });
    });

    expect(screen.getByText('Persistent')).toBeInTheDocument();

    // Advance a long time
    act(() => {
      vi.advanceTimersByTime(60000);
    });

    // Still there
    expect(screen.getByText('Persistent')).toBeInTheDocument();
  });
});

// ─── Hover pauses timer ────────────────────────────────────────────────────

describe('Notification -- hover pauses timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('pauses auto-dismiss on hover and resumes on leave', async () => {
    let api: ReturnType<typeof useNotifications>;

    render(
      <NotificationProvider>
        <TestConsumer onReady={(a) => { api = a; }} />
      </NotificationProvider>,
    );

    act(() => {
      api.show({ title: 'Hover me', duration: 5000 });
    });

    const notification = screen.getByText('Hover me').closest('[role="alert"]')!;
    expect(notification).toBeInTheDocument();

    // Advance half the time
    act(() => {
      vi.advanceTimersByTime(2500);
    });

    // Hover to pause
    act(() => {
      notification.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });

    // Advance well past the original duration while hovered
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    // Should still be visible because timer was paused
    expect(screen.getByText('Hover me')).toBeInTheDocument();

    // Unhover to resume
    act(() => {
      notification.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    });

    // Advance the remaining time (approximately 2500ms)
    act(() => {
      vi.advanceTimersByTime(2500);
    });

    // Allow exit animation
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.queryByText('Hover me')).not.toBeInTheDocument();
  });
});

// ─── useNotifications outside provider ─────────────────────────────────────

describe('useNotifications -- outside provider', () => {
  it('throws when used outside NotificationProvider', () => {
    // Suppress console.error for expected error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    function BadConsumer() {
      useNotifications();
      return null;
    }

    expect(() => render(<BadConsumer />)).toThrow(
      'useNotifications must be used within a NotificationProvider',
    );

    spy.mockRestore();
  });
});
