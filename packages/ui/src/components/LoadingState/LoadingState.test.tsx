import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LoadingState } from './LoadingState';

// ─── Default rendering ──────────────────────────────────────────────────────

describe('LoadingState -- default', () => {
  it('renders with status role', () => {
    render(<LoadingState />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has aria-label Loading', () => {
    render(<LoadingState />);
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('has aria-live polite', () => {
    render(<LoadingState />);
    const el = screen.getByRole('status');
    expect(el).toHaveAttribute('aria-live', 'polite');
  });
});

// ─── Spinner variant ────────────────────────────────────────────────────────

describe('LoadingState -- spinner variant', () => {
  it('renders an SVG spinner by default', () => {
    const { container } = render(<LoadingState />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.getAttribute('class')).toContain('animate-spin');
  });

  it('renders an SVG spinner when variant is spinner', () => {
    const { container } = render(<LoadingState variant="spinner" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});

// ─── Text & description ─────────────────────────────────────────────────────

describe('LoadingState -- text', () => {
  it('renders text when provided', () => {
    render(<LoadingState text="Loading data..." />);
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('does not render text element when not provided', () => {
    const { container } = render(<LoadingState />);
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBe(0);
  });
});

describe('LoadingState -- description', () => {
  it('renders description when provided', () => {
    render(<LoadingState text="Loading" description="This may take a moment" />);
    expect(screen.getByText('This may take a moment')).toBeInTheDocument();
  });

  it('renders both text and description', () => {
    render(<LoadingState text="Loading" description="Please wait" />);
    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(screen.getByText('Please wait')).toBeInTheDocument();
  });
});

// ─── fullPage ───────────────────────────────────────────────────────────────

describe('LoadingState -- fullPage', () => {
  it('applies min-h-[60vh] when fullPage is true', () => {
    const { container } = render(<LoadingState fullPage />);
    expect(container.firstElementChild?.className).toContain('min-h-[60vh]');
  });

  it('does not apply min-h-[60vh] by default', () => {
    const { container } = render(<LoadingState />);
    expect(container.firstElementChild?.className).not.toContain('min-h-[60vh]');
  });

  it('applies py-12 when not fullPage', () => {
    const { container } = render(<LoadingState />);
    expect(container.firstElementChild?.className).toContain('py-12');
  });
});

// ─── Dots variant ───────────────────────────────────────────────────────────

describe('LoadingState -- dots variant', () => {
  it('renders 3 bouncing dots', () => {
    render(<LoadingState variant="dots" />);
    const dotsContainer = screen.getByTestId('loading-dots');
    const dots = dotsContainer.querySelectorAll('.rounded-full');
    expect(dots.length).toBe(3);
  });

  it('does not render an SVG spinner', () => {
    const { container } = render(<LoadingState variant="dots" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeNull();
  });
});

// ─── Skeleton variant ───────────────────────────────────────────────────────

describe('LoadingState -- skeleton variant', () => {
  it('renders 3 skeleton lines', () => {
    render(<LoadingState variant="skeleton" />);
    const skeletonContainer = screen.getByTestId('loading-skeleton');
    const lines = skeletonContainer.querySelectorAll('.rounded-md');
    expect(lines.length).toBe(3);
  });

  it('last skeleton line is shorter (75%)', () => {
    render(<LoadingState variant="skeleton" />);
    const skeletonContainer = screen.getByTestId('loading-skeleton');
    const lines = skeletonContainer.querySelectorAll('.rounded-md');
    expect((lines[2] as HTMLElement).style.width).toBe('75%');
  });

  it('does not render an SVG spinner', () => {
    const { container } = render(<LoadingState variant="skeleton" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeNull();
  });
});

// ─── Sizes ──────────────────────────────────────────────────────────────────

describe('LoadingState -- sizes', () => {
  it('applies sm spinner size', () => {
    const { container } = render(<LoadingState size="sm" />);
    const spinner = container.querySelector('[class*="w-4"]');
    expect(spinner).toBeInTheDocument();
  });

  it('applies md spinner size', () => {
    const { container } = render(<LoadingState size="md" />);
    const spinner = container.querySelector('[class*="w-6"]');
    expect(spinner).toBeInTheDocument();
  });

  it('applies lg spinner size', () => {
    const { container } = render(<LoadingState size="lg" />);
    const spinner = container.querySelector('[class*="w-8"]');
    expect(spinner).toBeInTheDocument();
  });

  it('applies xl spinner size (default)', () => {
    const { container } = render(<LoadingState />);
    const spinner = container.querySelector('[class*="w-12"]');
    expect(spinner).toBeInTheDocument();
  });
});

// ─── className ──────────────────────────────────────────────────────────────

describe('LoadingState -- className', () => {
  it('merges custom className', () => {
    const { container } = render(<LoadingState className="custom-class" />);
    expect(container.firstElementChild).toHaveClass('custom-class');
  });
});

// ─── Ref forwarding ─────────────────────────────────────────────────────────

describe('LoadingState -- ref forwarding', () => {
  it('forwards ref to the root element', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<LoadingState ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

// ─── HTML attributes ────────────────────────────────────────────────────────

describe('LoadingState -- HTML attributes', () => {
  it('passes through additional HTML attributes', () => {
    render(<LoadingState data-testid="loading-state" id="ls-1" />);
    const el = screen.getByTestId('loading-state');
    expect(el).toHaveAttribute('id', 'ls-1');
  });
});
