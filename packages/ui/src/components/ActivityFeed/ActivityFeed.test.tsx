import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActivityFeed } from './ActivityFeed';
import type { ActivityFeedColor, ActivityFeedItem, ActivityFeedSize } from './ActivityFeed';

/* ------------------------------------------------------------------ */
/*  Fixtures                                                          */
/* ------------------------------------------------------------------ */

const baseItems: ActivityFeedItem[] = [
  {
    id: '1',
    actor: 'Alice',
    action: 'created',
    target: 'Project Alpha',
    timestamp: '2 hours ago',
  },
  {
    id: '2',
    actor: 'Bob',
    action: 'commented on',
    target: 'Issue #42',
    timestamp: '1 hour ago',
  },
  {
    id: '3',
    actor: 'Carol',
    action: 'deployed',
    target: 'v2.1.0',
    timestamp: '30 minutes ago',
  },
];

// ─── Basic Rendering ────────────────────────────────────────────────────────

describe('ActivityFeed -- renders items', () => {
  it('renders all feed items', () => {
    render(<ActivityFeed items={baseItems} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Carol')).toBeInTheDocument();
  });

  it('renders with role feed for accessibility', () => {
    render(<ActivityFeed items={baseItems} />);
    expect(screen.getByRole('feed')).toBeInTheDocument();
  });

  it('renders correct number of items', () => {
    const { container } = render(<ActivityFeed items={baseItems} />);
    const items = container.querySelectorAll('[data-testid="activity-feed-item"]');
    expect(items).toHaveLength(3);
  });

  it('renders correct number of dots', () => {
    const { container } = render(<ActivityFeed items={baseItems} />);
    const dots = container.querySelectorAll('[data-testid="activity-feed-dot"]');
    expect(dots).toHaveLength(3);
  });

  it('renders empty state with no items', () => {
    const { container } = render(<ActivityFeed items={[]} />);
    const items = container.querySelectorAll('[data-testid="activity-feed-item"]');
    expect(items).toHaveLength(0);
    // Container should still render
    expect(screen.getByRole('feed')).toBeInTheDocument();
  });
});

// ─── Actor / Action / Target Text ────────────────────────────────────────────

describe('ActivityFeed -- actor, action, and target text', () => {
  it('renders actor name with strong text styling', () => {
    render(<ActivityFeed items={[baseItems[0]]} />);
    const actor = screen.getByTestId('activity-feed-actor');
    expect(actor).toHaveTextContent('Alice');
    expect(actor).toHaveClass('text-text-strong');
    expect(actor).toHaveClass('font-semibold');
  });

  it('renders action text with secondary styling', () => {
    render(<ActivityFeed items={[baseItems[0]]} />);
    const action = screen.getByTestId('activity-feed-action');
    expect(action).toHaveTextContent('created');
    expect(action).toHaveClass('text-text-secondary');
  });

  it('renders target text with primary color', () => {
    render(<ActivityFeed items={[baseItems[0]]} />);
    const target = screen.getByTestId('activity-feed-target');
    expect(target).toHaveTextContent('Project Alpha');
    expect(target).toHaveClass('text-primary');
  });

  it('does not render target element when target is not provided', () => {
    const noTargetItem: ActivityFeedItem = {
      id: '1',
      actor: 'Alice',
      action: 'logged in',
      timestamp: 'Just now',
    };
    render(<ActivityFeed items={[noTargetItem]} />);
    expect(screen.queryByTestId('activity-feed-target')).not.toBeInTheDocument();
  });
});

// ─── Timestamps ─────────────────────────────────────────────────────────────

describe('ActivityFeed -- timestamps', () => {
  it('renders timestamp text', () => {
    render(<ActivityFeed items={[baseItems[0]]} />);
    const timestamp = screen.getByTestId('activity-feed-timestamp');
    expect(timestamp).toHaveTextContent('2 hours ago');
  });

  it('applies tertiary text style to timestamp', () => {
    render(<ActivityFeed items={[baseItems[0]]} />);
    const timestamp = screen.getByTestId('activity-feed-timestamp');
    expect(timestamp).toHaveClass('text-text-tertiary');
  });
});

// ─── Icons ──────────────────────────────────────────────────────────────────

describe('ActivityFeed -- icons', () => {
  it('renders custom icon inside the dot', () => {
    const items: ActivityFeedItem[] = [
      {
        id: '1',
        actor: 'Alice',
        action: 'committed',
        timestamp: 'Just now',
        icon: <span data-testid="custom-icon">*</span>,
      },
    ];
    render(<ActivityFeed items={items} />);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('renders icon dot with color background', () => {
    const items: ActivityFeedItem[] = [
      {
        id: '1',
        actor: 'Alice',
        action: 'committed',
        timestamp: 'Just now',
        icon: <span>I</span>,
        color: 'success',
      },
    ];
    const { container } = render(<ActivityFeed items={items} />);
    const dot = container.querySelector('[data-testid="activity-feed-dot"]');
    expect(dot).toHaveClass('bg-success');
    expect(dot).toHaveClass('text-white');
  });

  it('renders fallback initial when no avatar or icon provided', () => {
    const items: ActivityFeedItem[] = [
      {
        id: '1',
        actor: 'Bob',
        action: 'logged in',
        timestamp: 'Just now',
      },
    ];
    const { container } = render(<ActivityFeed items={items} />);
    const dot = container.querySelector('[data-testid="activity-feed-dot"]');
    expect(dot).toHaveTextContent('B');
  });
});

// ─── Avatars ────────────────────────────────────────────────────────────────

describe('ActivityFeed -- avatars', () => {
  it('renders custom avatar node', () => {
    const items: ActivityFeedItem[] = [
      {
        id: '1',
        actor: 'Alice',
        action: 'joined',
        timestamp: 'Just now',
        avatar: <img data-testid="custom-avatar" alt="Alice" src="/alice.png" />,
      },
    ];
    render(<ActivityFeed items={items} />);
    expect(screen.getByTestId('custom-avatar')).toBeInTheDocument();
  });

  it('applies ring to avatar dot with correct color', () => {
    const items: ActivityFeedItem[] = [
      {
        id: '1',
        actor: 'Alice',
        action: 'joined',
        timestamp: 'Just now',
        avatar: <img alt="Alice" src="/alice.png" />,
        color: 'danger',
      },
    ];
    const { container } = render(<ActivityFeed items={items} />);
    const dot = container.querySelector('[data-testid="activity-feed-dot"]');
    expect(dot).toHaveClass('ring-2');
    expect(dot).toHaveClass('ring-danger/25');
  });
});

// ─── Content Slot ───────────────────────────────────────────────────────────

describe('ActivityFeed -- content slot', () => {
  it('renders content below the action line', () => {
    const items: ActivityFeedItem[] = [
      {
        id: '1',
        actor: 'Alice',
        action: 'commented on',
        target: 'PR #15',
        timestamp: '5m ago',
        content: <p data-testid="comment-text">Looks good to me!</p>,
      },
    ];
    render(<ActivityFeed items={items} />);
    expect(screen.getByTestId('comment-text')).toBeInTheDocument();
    expect(screen.getByTestId('activity-feed-content')).toBeInTheDocument();
  });

  it('does not render content element when content is not provided', () => {
    render(<ActivityFeed items={[baseItems[0]]} />);
    expect(screen.queryByTestId('activity-feed-content')).not.toBeInTheDocument();
  });

  it('renders string content', () => {
    const items: ActivityFeedItem[] = [
      {
        id: '1',
        actor: 'Alice',
        action: 'noted',
        timestamp: 'Just now',
        content: 'A plain text note',
      },
    ];
    render(<ActivityFeed items={items} />);
    expect(screen.getByText('A plain text note')).toBeInTheDocument();
  });
});

// ─── Connector Line ─────────────────────────────────────────────────────────

describe('ActivityFeed -- connector line', () => {
  it('renders connector lines between items by default', () => {
    const { container } = render(<ActivityFeed items={baseItems} />);
    const connectors = container.querySelectorAll('[data-testid="activity-feed-connector"]');
    // 3 items => 2 connectors (none on last)
    expect(connectors).toHaveLength(2);
  });

  it('does not render connector on last item', () => {
    const twoItems = baseItems.slice(0, 2);
    const { container } = render(<ActivityFeed items={twoItems} />);
    const connectors = container.querySelectorAll('[data-testid="activity-feed-connector"]');
    expect(connectors).toHaveLength(1);
  });

  it('does not render connectors when showConnector is false', () => {
    const { container } = render(<ActivityFeed items={baseItems} showConnector={false} />);
    const connectors = container.querySelectorAll('[data-testid="activity-feed-connector"]');
    expect(connectors).toHaveLength(0);
  });

  it('renders connectors with surface-border background', () => {
    const { container } = render(<ActivityFeed items={baseItems} />);
    const connector = container.querySelector('[data-testid="activity-feed-connector"]');
    expect(connector).toHaveClass('bg-surface-border');
  });

  it('single item has no connector', () => {
    const { container } = render(<ActivityFeed items={[baseItems[0]]} />);
    const connectors = container.querySelectorAll('[data-testid="activity-feed-connector"]');
    expect(connectors).toHaveLength(0);
  });
});

// ─── No Connector Option ────────────────────────────────────────────────────

describe('ActivityFeed -- no connector option', () => {
  it('hides all connectors when showConnector=false', () => {
    const { container } = render(
      <ActivityFeed items={baseItems} showConnector={false} />,
    );
    expect(
      container.querySelectorAll('[data-testid="activity-feed-connector"]'),
    ).toHaveLength(0);
  });

  it('still renders dots when showConnector=false', () => {
    const { container } = render(
      <ActivityFeed items={baseItems} showConnector={false} />,
    );
    expect(
      container.querySelectorAll('[data-testid="activity-feed-dot"]'),
    ).toHaveLength(3);
  });
});

// ─── Color Variants ─────────────────────────────────────────────────────────

describe('ActivityFeed -- colors', () => {
  it.each<ActivityFeedColor>(['primary', 'success', 'warning', 'danger', 'info'])(
    'renders %s color without crashing',
    (color) => {
      const items: ActivityFeedItem[] = [
        { id: '1', actor: 'Test', action: 'did', timestamp: 'Now', color },
      ];
      const { container } = render(<ActivityFeed items={items} />);
      const dot = container.querySelector('[data-testid="activity-feed-dot"]');
      expect(dot).toBeInTheDocument();
    },
  );

  it('applies color to icon dot background', () => {
    const items: ActivityFeedItem[] = [
      {
        id: '1',
        actor: 'Test',
        action: 'did',
        timestamp: 'Now',
        color: 'danger',
        icon: <span>!</span>,
      },
    ];
    const { container } = render(<ActivityFeed items={items} />);
    const dot = container.querySelector('[data-testid="activity-feed-dot"]');
    expect(dot).toHaveClass('bg-danger');
  });

  it('applies color ring to avatar dot', () => {
    const items: ActivityFeedItem[] = [
      {
        id: '1',
        actor: 'Test',
        action: 'did',
        timestamp: 'Now',
        color: 'success',
        avatar: <span>A</span>,
      },
    ];
    const { container } = render(<ActivityFeed items={items} />);
    const dot = container.querySelector('[data-testid="activity-feed-dot"]');
    expect(dot).toHaveClass('ring-success/25');
  });

  it('defaults to primary color when none specified', () => {
    const items: ActivityFeedItem[] = [
      {
        id: '1',
        actor: 'Test',
        action: 'did',
        timestamp: 'Now',
        icon: <span>X</span>,
      },
    ];
    const { container } = render(<ActivityFeed items={items} />);
    const dot = container.querySelector('[data-testid="activity-feed-dot"]');
    expect(dot).toHaveClass('bg-primary');
  });
});

// ─── Sizes ──────────────────────────────────────────────────────────────────

describe('ActivityFeed -- sizes', () => {
  it.each<ActivityFeedSize>(['sm', 'md', 'lg'])(
    'renders %s size without crashing',
    (size) => {
      const { container } = render(<ActivityFeed items={baseItems} size={size} />);
      expect(container.firstElementChild).toBeInTheDocument();
    },
  );

  it('uses smaller dot for sm size', () => {
    const items: ActivityFeedItem[] = [
      { id: '1', actor: 'A', action: 'did', timestamp: 'Now', icon: <span>X</span> },
    ];
    const { container } = render(<ActivityFeed items={items} size="sm" />);
    const dot = container.querySelector('[data-testid="activity-feed-dot"]');
    expect(dot).toHaveClass('w-6');
    expect(dot).toHaveClass('h-6');
  });

  it('uses larger dot for lg size', () => {
    const items: ActivityFeedItem[] = [
      { id: '1', actor: 'A', action: 'did', timestamp: 'Now', icon: <span>X</span> },
    ];
    const { container } = render(<ActivityFeed items={items} size="lg" />);
    const dot = container.querySelector('[data-testid="activity-feed-dot"]');
    expect(dot).toHaveClass('w-10');
    expect(dot).toHaveClass('h-10');
  });

  it('applies compact spacing for sm size', () => {
    const { container } = render(<ActivityFeed items={baseItems} size="sm" />);
    const firstItem = container.querySelector('[data-testid="activity-feed-item"]');
    expect(firstItem).toHaveClass('pb-4');
  });

  it('applies generous spacing for lg size', () => {
    const { container } = render(<ActivityFeed items={baseItems} size="lg" />);
    const firstItem = container.querySelector('[data-testid="activity-feed-item"]');
    expect(firstItem).toHaveClass('pb-8');
  });

  it('uses smaller text for sm size actor', () => {
    render(<ActivityFeed items={[baseItems[0]]} size="sm" />);
    const actor = screen.getByTestId('activity-feed-actor');
    expect(actor).toHaveClass('text-xs');
  });

  it('uses larger text for lg size actor', () => {
    render(<ActivityFeed items={[baseItems[0]]} size="lg" />);
    const actor = screen.getByTestId('activity-feed-actor');
    expect(actor).toHaveClass('text-base');
  });
});

// ─── className ──────────────────────────────────────────────────────────────

describe('ActivityFeed -- className', () => {
  it('merges custom className on container', () => {
    const { container } = render(
      <ActivityFeed items={baseItems} className="my-custom-class" />,
    );
    expect(container.firstElementChild).toHaveClass('my-custom-class');
  });

  it('preserves default classes when custom className is added', () => {
    const { container } = render(
      <ActivityFeed items={baseItems} className="my-class" />,
    );
    expect(container.firstElementChild).toHaveClass('flex');
    expect(container.firstElementChild).toHaveClass('flex-col');
    expect(container.firstElementChild).toHaveClass('my-class');
  });
});

// ─── Ref Forwarding ─────────────────────────────────────────────────────────

describe('ActivityFeed -- ref forwarding', () => {
  it('forwards ref on container', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<ActivityFeed ref={ref} items={baseItems} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

// ─── HTML Attributes ────────────────────────────────────────────────────────

describe('ActivityFeed -- HTML attributes', () => {
  it('passes through additional HTML attributes', () => {
    render(
      <ActivityFeed data-testid="my-feed" id="feed-1" items={baseItems} />,
    );
    const el = screen.getByTestId('my-feed');
    expect(el).toHaveAttribute('id', 'feed-1');
  });
});
