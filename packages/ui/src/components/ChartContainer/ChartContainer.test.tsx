import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChartContainer } from './ChartContainer';
import type { TimeRange } from './ChartContainer';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const timeRanges: TimeRange[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
];

// ─── Title ──────────────────────────────────────────────────────────────────

describe('ChartContainer -- title', () => {
  it('renders title', () => {
    render(
      <ChartContainer title="Revenue">
        <div>chart</div>
      </ChartContainer>,
    );
    expect(screen.getByText('Revenue')).toBeInTheDocument();
  });
});

// ─── Subtitle ───────────────────────────────────────────────────────────────

describe('ChartContainer -- subtitle', () => {
  it('renders subtitle', () => {
    render(
      <ChartContainer title="Revenue" subtitle="Last 30 days">
        <div>chart</div>
      </ChartContainer>,
    );
    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
  });
});

// ─── Children ───────────────────────────────────────────────────────────────

describe('ChartContainer -- children', () => {
  it('renders children (chart content)', () => {
    render(
      <ChartContainer title="Revenue">
        <div data-testid="mock-chart">Mock Chart</div>
      </ChartContainer>,
    );
    expect(screen.getByTestId('mock-chart')).toBeInTheDocument();
  });
});

// ─── Time Range Pills ──────────────────────────────────────────────────────

describe('ChartContainer -- time range pills', () => {
  it('renders time range pills', () => {
    render(
      <ChartContainer title="Revenue" timeRanges={timeRanges} activeTimeRange="7d">
        <div>chart</div>
      </ChartContainer>,
    );
    expect(screen.getByText('7D')).toBeInTheDocument();
    expect(screen.getByText('30D')).toBeInTheDocument();
    expect(screen.getByText('90D')).toBeInTheDocument();
  });

  it('calls onTimeRangeChange on pill click', () => {
    const onChange = vi.fn();
    render(
      <ChartContainer
        title="Revenue"
        timeRanges={timeRanges}
        activeTimeRange="7d"
        onTimeRangeChange={onChange}
      >
        <div>chart</div>
      </ChartContainer>,
    );
    fireEvent.click(screen.getByText('30D'));
    expect(onChange).toHaveBeenCalledWith('30d');
  });

  it('highlights active time range', () => {
    render(
      <ChartContainer title="Revenue" timeRanges={timeRanges} activeTimeRange="30d">
        <div>chart</div>
      </ChartContainer>,
    );
    const activeButton = screen.getByText('30D');
    expect(activeButton.className).toContain('bg-primary');
    expect(activeButton.getAttribute('aria-pressed')).toBe('true');

    const inactiveButton = screen.getByText('7D');
    expect(inactiveButton.className).not.toContain('bg-primary');
    expect(inactiveButton.getAttribute('aria-pressed')).toBe('false');
  });
});

// ─── Loading State ──────────────────────────────────────────────────────────

describe('ChartContainer -- loading', () => {
  it('shows loading state with spinner', () => {
    render(
      <ChartContainer title="Revenue" loading>
        <div data-testid="mock-chart">chart</div>
      </ChartContainer>,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-chart')).not.toBeInTheDocument();
  });
});

// ─── Empty State ────────────────────────────────────────────────────────────

describe('ChartContainer -- empty', () => {
  it('shows empty state with message', () => {
    render(
      <ChartContainer title="Revenue" empty emptyMessage="Nothing to show">
        <div data-testid="mock-chart">chart</div>
      </ChartContainer>,
    );
    expect(screen.getByText('Nothing to show')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-chart')).not.toBeInTheDocument();
  });

  it('shows default empty message when emptyMessage is not provided', () => {
    render(
      <ChartContainer title="Revenue" empty>
        <div>chart</div>
      </ChartContainer>,
    );
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });
});

// ─── Legend Slot ────────────────────────────────────────────────────────────

describe('ChartContainer -- legend slot', () => {
  it('renders legend slot', () => {
    render(
      <ChartContainer
        title="Revenue"
        legend={<div data-testid="legend">Legend content</div>}
      >
        <div>chart</div>
      </ChartContainer>,
    );
    expect(screen.getByTestId('legend')).toBeInTheDocument();
  });
});

// ─── Actions Slot ───────────────────────────────────────────────────────────

describe('ChartContainer -- actions slot', () => {
  it('renders actions slot', () => {
    render(
      <ChartContainer
        title="Revenue"
        actions={<button data-testid="action-btn">Download</button>}
      >
        <div>chart</div>
      </ChartContainer>,
    );
    expect(screen.getByTestId('action-btn')).toBeInTheDocument();
  });
});

// ─── Custom Height ──────────────────────────────────────────────────────────

describe('ChartContainer -- custom height', () => {
  it('applies custom height', () => {
    const { container } = render(
      <ChartContainer title="Revenue" height={500}>
        <div>chart</div>
      </ChartContainer>,
    );
    const chartArea = container.querySelector('.px-5.pb-5');
    expect(chartArea).toHaveStyle({ height: '500px' });
  });

  it('supports string height', () => {
    const { container } = render(
      <ChartContainer title="Revenue" height="50vh">
        <div>chart</div>
      </ChartContainer>,
    );
    const chartArea = container.querySelector('.px-5.pb-5');
    expect(chartArea).toHaveStyle({ height: '50vh' });
  });
});
