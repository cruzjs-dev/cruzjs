import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusDot } from './StatusDot';
import type { StatusDotStatus, StatusDotSize } from './StatusDot';

// --- Basic Rendering ---

describe('StatusDot -- renders dot', () => {
  it('renders with status role', () => {
    render(<StatusDot status="online" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the dot element', () => {
    const { container } = render(<StatusDot status="online" />);
    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass('rounded-full');
  });
});

// --- Color per Status ---

describe('StatusDot -- correct color per status', () => {
  it.each<[StatusDotStatus, string]>([
    ['online', 'bg-success'],
    ['offline', 'bg-text-muted'],
    ['busy', 'bg-danger'],
    ['away', 'bg-warning'],
    ['none', 'bg-surface-border'],
  ])('renders %s status with %s class', (status, expectedClass) => {
    const { container } = render(<StatusDot status={status} />);
    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot).toHaveClass(expectedClass);
  });
});

// --- Pulse Animation ---

describe('StatusDot -- pulse animation', () => {
  it('applies pulse class when pulse is true and status is online', () => {
    const { container } = render(<StatusDot status="online" pulse />);
    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot).toHaveClass('status-dot-pulse');
  });

  it('does not apply pulse class when status is not online', () => {
    const { container } = render(<StatusDot status="busy" pulse />);
    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot).not.toHaveClass('status-dot-pulse');
  });

  it('does not apply pulse class when pulse is false', () => {
    const { container } = render(<StatusDot status="online" />);
    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot).not.toHaveClass('status-dot-pulse');
  });
});

// --- Label Text ---

describe('StatusDot -- label text', () => {
  it('renders label text when provided', () => {
    render(<StatusDot status="online" label="Active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('does not render label text when not provided', () => {
    const { container } = render(<StatusDot status="online" />);
    // Only the dot element and the style tag, no text span
    const spans = container.querySelectorAll('span');
    // Root span + dot span = 2 spans
    expect(spans.length).toBe(2);
  });
});

// --- Sizes ---

describe('StatusDot -- sizes', () => {
  it.each<[StatusDotSize, string]>([
    ['sm', 'w-2'],
    ['md', 'w-2.5'],
    ['lg', 'w-3'],
  ])('renders %s size with correct class', (size, expectedClass) => {
    const { container } = render(<StatusDot status="online" size={size} />);
    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot).toHaveClass(expectedClass);
  });
});

// --- Aria Label ---

describe('StatusDot -- aria-label', () => {
  it('has default aria-label based on status', () => {
    render(<StatusDot status="online" />);
    expect(screen.getByLabelText('Online')).toBeInTheDocument();
  });

  it('uses custom label for aria-label when provided', () => {
    render(<StatusDot status="online" label="Active now" />);
    expect(screen.getByLabelText('Active now')).toBeInTheDocument();
  });

  it.each<[StatusDotStatus, string]>([
    ['online', 'Online'],
    ['offline', 'Offline'],
    ['busy', 'Busy'],
    ['away', 'Away'],
    ['none', 'No status'],
  ])('has correct default aria-label for %s status', (status, expectedLabel) => {
    render(<StatusDot status={status} />);
    expect(screen.getByLabelText(expectedLabel)).toBeInTheDocument();
  });
});

// --- Ref Forwarding ---

describe('StatusDot -- ref forwarding', () => {
  it('forwards ref to the root span element', () => {
    const ref = { current: null as HTMLSpanElement | null };
    render(<StatusDot ref={ref} status="online" />);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });
});

// --- Custom className ---

describe('StatusDot -- className merging', () => {
  it('merges custom className', () => {
    const { container } = render(<StatusDot status="online" className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
