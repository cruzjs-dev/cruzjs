import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Timeline, TimelineItem } from './Timeline';
import type { TimelineColor, TimelineSize } from './Timeline';

// ─── Basic Rendering ────────────────────────────────────────────────────────

describe('Timeline -- renders items', () => {
  it('renders all timeline items', () => {
    render(
      <Timeline>
        <TimelineItem title="First event" />
        <TimelineItem title="Second event" />
        <TimelineItem title="Third event" />
      </Timeline>,
    );
    expect(screen.getByText('First event')).toBeInTheDocument();
    expect(screen.getByText('Second event')).toBeInTheDocument();
    expect(screen.getByText('Third event')).toBeInTheDocument();
  });

  it('renders with role list for accessibility', () => {
    render(
      <Timeline>
        <TimelineItem title="Event" />
      </Timeline>,
    );
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('renders correct number of dots', () => {
    const { container } = render(
      <Timeline>
        <TimelineItem title="First" />
        <TimelineItem title="Second" />
        <TimelineItem title="Third" />
      </Timeline>,
    );
    const dots = container.querySelectorAll('[data-testid="timeline-dot"]');
    expect(dots).toHaveLength(3);
  });
});

// ─── Titles and Descriptions ────────────────────────────────────────────────

describe('Timeline -- shows titles and descriptions', () => {
  it('renders title text', () => {
    render(
      <Timeline>
        <TimelineItem title="Deploy completed" />
      </Timeline>,
    );
    expect(screen.getByTestId('timeline-title')).toHaveTextContent('Deploy completed');
  });

  it('renders description when provided', () => {
    render(
      <Timeline>
        <TimelineItem title="Build" description="Compilation finished in 3.2s" />
      </Timeline>,
    );
    expect(screen.getByTestId('timeline-description')).toHaveTextContent(
      'Compilation finished in 3.2s',
    );
  });

  it('does not render description element when not provided', () => {
    render(
      <Timeline>
        <TimelineItem title="Simple event" />
      </Timeline>,
    );
    expect(screen.queryByTestId('timeline-description')).not.toBeInTheDocument();
  });

  it('renders ReactNode description', () => {
    render(
      <Timeline>
        <TimelineItem
          title="Complex"
          description={<span data-testid="custom-desc">Custom content</span>}
        />
      </Timeline>,
    );
    expect(screen.getByTestId('custom-desc')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <Timeline>
        <TimelineItem title="With children">
          <button>Action button</button>
        </TimelineItem>
      </Timeline>,
    );
    expect(screen.getByText('Action button')).toBeInTheDocument();
  });
});

// ─── Timestamps ─────────────────────────────────────────────────────────────

describe('Timeline -- timestamps', () => {
  it('renders timestamp when provided', () => {
    render(
      <Timeline>
        <TimelineItem title="Deploy" timestamp="2 hours ago" />
      </Timeline>,
    );
    expect(screen.getByTestId('timeline-timestamp')).toHaveTextContent('2 hours ago');
  });

  it('does not render timestamp element when not provided', () => {
    render(
      <Timeline>
        <TimelineItem title="No time" />
      </Timeline>,
    );
    expect(screen.queryByTestId('timeline-timestamp')).not.toBeInTheDocument();
  });
});

// ─── Custom Icons ───────────────────────────────────────────────────────────

describe('Timeline -- custom icons', () => {
  it('renders custom icon inside the dot', () => {
    render(
      <Timeline>
        <TimelineItem
          title="With icon"
          icon={<span data-testid="custom-icon">*</span>}
        />
      </Timeline>,
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('renders icon dot with larger size than plain dot', () => {
    const { container } = render(
      <Timeline>
        <TimelineItem
          title="Icon item"
          icon={<span>I</span>}
        />
      </Timeline>,
    );
    const dot = container.querySelector('[data-testid="timeline-dot"]');
    // Icon dots use iconDotSize (w-8 h-8 for md) vs dotSize (w-4 h-4)
    expect(dot).toHaveClass('w-8');
    expect(dot).toHaveClass('h-8');
  });
});

// ─── Active Item Styling ────────────────────────────────────────────────────

describe('Timeline -- active item styling', () => {
  it('marks active item with data-active attribute', () => {
    const { container } = render(
      <Timeline>
        <TimelineItem title="Normal" />
        <TimelineItem title="Active" active />
        <TimelineItem title="Normal" />
      </Timeline>,
    );
    const activeItem = container.querySelector('[data-active]');
    expect(activeItem).toBeInTheDocument();
  });

  it('applies ring to active item dot', () => {
    const { container } = render(
      <Timeline>
        <TimelineItem title="Active" active />
      </Timeline>,
    );
    const dot = container.querySelector('[data-testid="timeline-dot"]');
    expect(dot).toHaveClass('ring-4');
  });

  it('does not apply ring to inactive item dot', () => {
    const { container } = render(
      <Timeline>
        <TimelineItem title="Inactive" />
      </Timeline>,
    );
    const dot = container.querySelector('[data-testid="timeline-dot"]');
    expect(dot).not.toHaveClass('ring-4');
  });

  it('applies larger dot size for active items', () => {
    const { container } = render(
      <Timeline size="md">
        <TimelineItem title="Active" active />
      </Timeline>,
    );
    const dot = container.querySelector('[data-testid="timeline-dot"]');
    // Active md dot: w-5 h-5 (dotSizeActive) vs w-4 h-4 (dotSize)
    expect(dot).toHaveClass('w-5');
    expect(dot).toHaveClass('h-5');
  });

  it('uses text-text-strong for active title', () => {
    render(
      <Timeline>
        <TimelineItem title="Active title" active />
      </Timeline>,
    );
    const title = screen.getByTestId('timeline-title');
    expect(title).toHaveClass('text-text-strong');
  });
});

// ─── Color Variants ─────────────────────────────────────────────────────────

describe('Timeline -- color variants', () => {
  it.each<TimelineColor>(['primary', 'success', 'warning', 'danger', 'info'])(
    'renders %s color without crashing',
    (color) => {
      const { container } = render(
        <Timeline>
          <TimelineItem title="Test" color={color} />
        </Timeline>,
      );
      const dot = container.querySelector('[data-testid="timeline-dot"]');
      expect(dot).toBeInTheDocument();
    },
  );

  it('applies bg-success class for success color with active', () => {
    const { container } = render(
      <Timeline>
        <TimelineItem title="Success" color="success" active />
      </Timeline>,
    );
    const dot = container.querySelector('[data-testid="timeline-dot"]');
    expect(dot).toHaveClass('bg-success');
  });

  it('applies bg-danger class for danger color with active', () => {
    const { container } = render(
      <Timeline>
        <TimelineItem title="Danger" color="danger" active />
      </Timeline>,
    );
    const dot = container.querySelector('[data-testid="timeline-dot"]');
    expect(dot).toHaveClass('bg-danger');
  });
});

// ─── Dashed Line Style ──────────────────────────────────────────────────────

describe('Timeline -- dashed line style', () => {
  it('renders dashed connector lines', () => {
    const { container } = render(
      <Timeline lineStyle="dashed">
        <TimelineItem title="First" />
        <TimelineItem title="Second" />
      </Timeline>,
    );
    const connector = container.querySelector('[data-testid="timeline-connector"]');
    expect(connector).toHaveClass('border-dashed');
  });

  it('renders solid connector lines by default', () => {
    const { container } = render(
      <Timeline>
        <TimelineItem title="First" />
        <TimelineItem title="Second" />
      </Timeline>,
    );
    const connector = container.querySelector('[data-testid="timeline-connector"]');
    expect(connector).not.toHaveClass('border-dashed');
    expect(connector).toHaveClass('bg-surface-border');
  });

  it('does not render connector on last item', () => {
    const { container } = render(
      <Timeline>
        <TimelineItem title="First" />
        <TimelineItem title="Last" />
      </Timeline>,
    );
    const connectors = container.querySelectorAll('[data-testid="timeline-connector"]');
    // Only 1 connector for 2 items (none on the last)
    expect(connectors).toHaveLength(1);
  });
});

// ─── Alternate Alignment ────────────────────────────────────────────────────

describe('Timeline -- alternate alignment', () => {
  it('renders alternate layout with items on both sides', () => {
    const { container } = render(
      <Timeline align="alternate">
        <TimelineItem title="Left item" />
        <TimelineItem title="Right item" />
        <TimelineItem title="Left again" />
      </Timeline>,
    );
    // Odd-indexed items (right) should have data-timeline-item="1"
    const rightItem = container.querySelector('[data-timeline-item="1"]');
    expect(rightItem).toBeInTheDocument();
    // Right items have text-right alignment
    const contentDiv = rightItem?.querySelector('.text-right');
    expect(contentDiv).toBeInTheDocument();
  });

  it('does not apply text-right for left-aligned items', () => {
    const { container } = render(
      <Timeline align="left">
        <TimelineItem title="Left only" />
      </Timeline>,
    );
    const item = container.querySelector('[data-timeline-item="0"]');
    expect(item?.querySelector('.text-right')).not.toBeInTheDocument();
  });
});

// ─── Sizes ──────────────────────────────────────────────────────────────────

describe('Timeline -- sizes', () => {
  it.each<TimelineSize>(['sm', 'md', 'lg'])(
    'renders %s size without crashing',
    (size) => {
      const { container } = render(
        <Timeline size={size}>
          <TimelineItem title="Test" />
          <TimelineItem title="Test 2" />
        </Timeline>,
      );
      expect(container.firstElementChild).toBeInTheDocument();
    },
  );

  it('uses smaller dot for sm size', () => {
    const { container } = render(
      <Timeline size="sm">
        <TimelineItem title="Small" />
      </Timeline>,
    );
    const dot = container.querySelector('[data-testid="timeline-dot"]');
    expect(dot).toHaveClass('w-3');
    expect(dot).toHaveClass('h-3');
  });

  it('uses larger dot for lg size', () => {
    const { container } = render(
      <Timeline size="lg">
        <TimelineItem title="Large" />
      </Timeline>,
    );
    const dot = container.querySelector('[data-testid="timeline-dot"]');
    expect(dot).toHaveClass('w-5');
    expect(dot).toHaveClass('h-5');
  });

  it('applies compact spacing for sm size', () => {
    const { container } = render(
      <Timeline size="sm">
        <TimelineItem title="First" />
        <TimelineItem title="Second" />
      </Timeline>,
    );
    const firstItem = container.querySelector('[data-timeline-item="0"]');
    expect(firstItem).toHaveClass('pb-4');
  });

  it('applies generous spacing for lg size', () => {
    const { container } = render(
      <Timeline size="lg">
        <TimelineItem title="First" />
        <TimelineItem title="Second" />
      </Timeline>,
    );
    const firstItem = container.querySelector('[data-timeline-item="0"]');
    expect(firstItem).toHaveClass('pb-8');
  });
});

// ─── className ──────────────────────────────────────────────────────────────

describe('Timeline -- className', () => {
  it('merges custom className on Timeline container', () => {
    const { container } = render(
      <Timeline className="my-custom-class">
        <TimelineItem title="Test" />
      </Timeline>,
    );
    expect(container.firstElementChild).toHaveClass('my-custom-class');
  });

  it('preserves default classes when custom className is added', () => {
    const { container } = render(
      <Timeline className="my-class">
        <TimelineItem title="Test" />
      </Timeline>,
    );
    expect(container.firstElementChild).toHaveClass('flex');
    expect(container.firstElementChild).toHaveClass('flex-col');
    expect(container.firstElementChild).toHaveClass('my-class');
  });

  it('merges custom className on TimelineItem', () => {
    const { container } = render(
      <Timeline>
        <TimelineItem title="Test" className="item-custom" />
      </Timeline>,
    );
    const item = container.querySelector('[data-timeline-item="0"]');
    expect(item).toHaveClass('item-custom');
  });
});

// ─── Ref Forwarding ─────────────────────────────────────────────────────────

describe('Timeline -- ref forwarding', () => {
  it('forwards ref on Timeline container', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(
      <Timeline ref={ref}>
        <TimelineItem title="Test" />
      </Timeline>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('forwards ref on TimelineItem', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(
      <Timeline>
        <TimelineItem ref={ref} title="Test" />
      </Timeline>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

// ─── HTML Attributes ────────────────────────────────────────────────────────

describe('Timeline -- HTML attributes', () => {
  it('passes through additional HTML attributes on Timeline', () => {
    render(
      <Timeline data-testid="my-timeline" id="timeline-1">
        <TimelineItem title="Test" />
      </Timeline>,
    );
    const el = screen.getByTestId('my-timeline');
    expect(el).toHaveAttribute('id', 'timeline-1');
  });
});
