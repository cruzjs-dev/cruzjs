import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatsGrid } from './StatsGrid';
import type { StatItem } from './StatsGrid';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const basicStats: StatItem[] = [
  { label: 'Revenue', value: '$12,345' },
  { label: 'Users', value: 1234 },
  { label: 'Orders', value: 456 },
  { label: 'Conversion', value: '3.2%' },
];

// ─── Label Rendering ────────────────────────────────────────────────────────

describe('StatsGrid -- labels', () => {
  it('renders all stat labels', () => {
    render(<StatsGrid stats={basicStats} />);
    for (const stat of basicStats) {
      expect(screen.getByText(stat.label)).toBeInTheDocument();
    }
  });
});

// ─── Value Rendering ────────────────────────────────────────────────────────

describe('StatsGrid -- values', () => {
  it('renders all stat values', () => {
    render(<StatsGrid stats={basicStats} />);
    expect(screen.getByText('$12,345')).toBeInTheDocument();
    expect(screen.getByText('1234')).toBeInTheDocument();
    expect(screen.getByText('456')).toBeInTheDocument();
    expect(screen.getByText('3.2%')).toBeInTheDocument();
  });
});

// ─── Trend Indicators ───────────────────────────────────────────────────────

describe('StatsGrid -- trends', () => {
  it('shows trend up indicator with correct color', () => {
    const stats: StatItem[] = [
      { label: 'Revenue', value: 100, delta: 12.5, trend: 'up' },
    ];
    render(<StatsGrid stats={stats} />);
    const indicator = screen.getByTestId('trend-up');
    expect(indicator).toBeInTheDocument();
    expect(indicator.className).toContain('text-success');
    expect(screen.getByText('12.5%')).toBeInTheDocument();
  });

  it('shows trend down indicator', () => {
    const stats: StatItem[] = [
      { label: 'Users', value: 80, delta: 5.3, trend: 'down' },
    ];
    render(<StatsGrid stats={stats} />);
    const indicator = screen.getByTestId('trend-down');
    expect(indicator).toBeInTheDocument();
    expect(indicator.className).toContain('text-danger');
    expect(screen.getByText('5.3%')).toBeInTheDocument();
  });
});

// ─── Auto-calculated Delta ──────────────────────────────────────────────────

describe('StatsGrid -- auto-calculated delta', () => {
  it('auto-calculates delta from previousValue', () => {
    const stats: StatItem[] = [
      { label: 'Users', value: 120, previousValue: 100 },
    ];
    render(<StatsGrid stats={stats} />);
    // 120 vs 100 = 20% increase
    expect(screen.getByText('20%')).toBeInTheDocument();
    expect(screen.getByTestId('trend-up')).toBeInTheDocument();
  });

  it('auto-calculates negative delta from previousValue', () => {
    const stats: StatItem[] = [
      { label: 'Users', value: 80, previousValue: 100 },
    ];
    render(<StatsGrid stats={stats} />);
    // 80 vs 100 = -20% decrease
    expect(screen.getByText('20%')).toBeInTheDocument();
    expect(screen.getByTestId('trend-down')).toBeInTheDocument();
  });
});

// ─── Icons ──────────────────────────────────────────────────────────────────

describe('StatsGrid -- icons', () => {
  it('renders icons', () => {
    const stats: StatItem[] = [
      { label: 'Revenue', value: 100, icon: <span data-testid="stat-icon">$</span> },
    ];
    render(<StatsGrid stats={stats} />);
    expect(screen.getByTestId('stat-icon')).toBeInTheDocument();
  });
});

// ─── Grid Items ─────────────────────────────────────────────────────────────

describe('StatsGrid -- grid items', () => {
  it('renders correct number of grid items', () => {
    const { container } = render(<StatsGrid stats={basicStats} />);
    const grid = container.firstElementChild;
    expect(grid?.children.length).toBe(4);
  });
});

// ─── Variants ───────────────────────────────────────────────────────────────

describe('StatsGrid -- variants', () => {
  it('applies default variant classes', () => {
    const { container } = render(
      <StatsGrid stats={[{ label: 'Test', value: 1 }]} variant="default" />,
    );
    const card = container.firstElementChild?.firstElementChild;
    expect(card?.className).toContain('bg-surface');
    expect(card?.className).toContain('rounded-xl');
    expect(card?.className).toContain('p-5');
  });

  it('applies compact variant classes', () => {
    const { container } = render(
      <StatsGrid stats={[{ label: 'Test', value: 1 }]} variant="compact" />,
    );
    const card = container.firstElementChild?.firstElementChild;
    expect(card?.className).toContain('bg-surface-lighter');
    expect(card?.className).toContain('rounded-lg');
    expect(card?.className).toContain('p-4');
  });

  it('applies bordered variant classes', () => {
    const { container } = render(
      <StatsGrid stats={[{ label: 'Test', value: 1 }]} variant="bordered" />,
    );
    const card = container.firstElementChild?.firstElementChild;
    expect(card?.className).toContain('border');
    expect(card?.className).toContain('border-surface-border');
    expect(card?.className).toContain('rounded-xl');
    expect(card?.className).toContain('p-5');
  });
});

// ─── className ──────────────────────────────────────────────────────────────

describe('StatsGrid -- className', () => {
  it('supports custom className', () => {
    const { container } = render(
      <StatsGrid stats={basicStats} className="custom-class" />,
    );
    expect(container.firstElementChild).toHaveClass('custom-class');
  });
});

// ─── Ref Forwarding ─────────────────────────────────────────────────────────

describe('StatsGrid -- ref forwarding', () => {
  it('forwards ref to the root element', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<StatsGrid ref={ref} stats={basicStats} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
