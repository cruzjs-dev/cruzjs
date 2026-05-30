import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('renders as aria-hidden', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies shimmer animation by default', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild?.className).toContain('shimmer');
  });

  it('disables animation when animate=false', () => {
    const { container } = render(<Skeleton animate={false} />);
    expect(container.firstElementChild?.className).not.toContain('shimmer');
  });

  it('renders circular variant', () => {
    const { container } = render(<Skeleton variant="circular" />);
    expect(container.firstElementChild?.className).toContain('rounded-full');
  });

  it('renders rounded variant', () => {
    const { container } = render(<Skeleton variant="rounded" />);
    expect(container.firstElementChild?.className).toContain('rounded-xl');
  });

  it('renders multiple lines', () => {
    const { container } = render(<Skeleton lines={3} />);
    const lines = container.querySelectorAll('[aria-hidden="true"]');
    expect(lines.length).toBe(3);
  });

  it('last line is shorter with multiple lines', () => {
    const { container } = render(<Skeleton lines={3} />);
    const lines = container.querySelectorAll('[aria-hidden="true"]');
    expect((lines[2] as HTMLElement).style.width).toBe('75%');
    expect((lines[0] as HTMLElement).style.width).toBe('100%');
  });

  it('applies custom width and height', () => {
    const { container } = render(<Skeleton width={200} height={40} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.width).toBe('200px');
    expect(el.style.height).toBe('40px');
  });
});
