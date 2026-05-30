import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressCircular } from './ProgressCircular';

describe('ProgressCircular', () => {
  it('renders with progressbar role', () => {
    render(<ProgressCircular value={50} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('sets aria-valuenow to percentage', () => {
    render(<ProgressCircular value={75} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75');
  });

  it('clamps value between 0 and 100', () => {
    render(<ProgressCircular value={150} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('clamps negative value to 0', () => {
    render(<ProgressCircular value={-10} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('shows percentage when showValue is true', () => {
    render(<ProgressCircular value={42} showValue />);
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('does not show value by default', () => {
    const { container } = render(<ProgressCircular value={42} />);
    expect(container.querySelector('span.relative')).toBeNull();
  });

  it('renders children instead of percentage', () => {
    render(<ProgressCircular value={50}>Custom</ProgressCircular>);
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('does not set aria-valuenow when indeterminate', () => {
    render(<ProgressCircular indeterminate />);
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
  });

  it('uses custom max', () => {
    render(<ProgressCircular value={5} max={10} showValue />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('renders SVG with two circles', () => {
    const { container } = render(<ProgressCircular value={60} />);
    const circles = container.querySelectorAll('circle');
    expect(circles).toHaveLength(2);
  });

  it('applies indeterminate spin animation', () => {
    const { container } = render(<ProgressCircular indeterminate />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('class')).toContain('animate-spin');
  });
});
