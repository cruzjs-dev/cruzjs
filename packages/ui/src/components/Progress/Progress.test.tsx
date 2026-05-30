import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Progress } from './Progress';

describe('Progress', () => {
  it('renders with progressbar role', () => {
    render(<Progress value={50} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('sets aria-valuenow to percentage', () => {
    render(<Progress value={75} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75');
  });

  it('clamps value between 0 and 100', () => {
    render(<Progress value={150} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('renders label', () => {
    render(<Progress value={50} label="Upload progress" />);
    expect(screen.getByText('Upload progress')).toBeInTheDocument();
  });

  it('shows percentage when showValue is true', () => {
    render(<Progress value={42} showValue />);
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('shows dots for indeterminate with showValue', () => {
    render(<Progress indeterminate showValue />);
    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('does not set aria-valuenow when indeterminate', () => {
    render(<Progress indeterminate />);
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
  });

  it('uses custom max', () => {
    render(<Progress value={5} max={10} showValue />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });
});
