import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Spinner } from './Spinner';

describe('Spinner', () => {
  it('renders with status role', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has default Loading label', () => {
    render(<Spinner />);
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('accepts custom label', () => {
    render(<Spinner label="Saving" />);
    expect(screen.getByLabelText('Saving')).toBeInTheDocument();
  });

  it('renders sr-only text', () => {
    render(<Spinner label="Processing" />);
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Spinner className="custom" />);
    expect(container.firstElementChild?.className).toContain('custom');
  });

  it('renders SVG with animation', () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.getAttribute('class')).toContain('animate-spin');
  });
});
