import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NumberInput } from './NumberInput';

describe('NumberInput', () => {
  it('renders with spinbutton role', () => {
    render(<NumberInput />);
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
  });

  it('renders label', () => {
    render(<NumberInput label="Quantity" />);
    expect(screen.getByText('Quantity')).toBeInTheDocument();
  });

  it('renders error', () => {
    render(<NumberInput error="Invalid" />);
    expect(screen.getByText('Invalid')).toBeInTheDocument();
  });

  it('increments on + click', () => {
    const onChange = vi.fn();
    render(<NumberInput defaultValue={5} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Increase'));
    expect(onChange).toHaveBeenCalledWith(6);
  });

  it('decrements on - click', () => {
    const onChange = vi.fn();
    render(<NumberInput defaultValue={5} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Decrease'));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('respects min/max', () => {
    render(<NumberInput defaultValue={0} min={0} max={10} />);
    expect(screen.getByLabelText('Decrease')).toBeDisabled();
  });

  it('handles keyboard ArrowUp', () => {
    const onChange = vi.fn();
    render(<NumberInput defaultValue={3} onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole('spinbutton'), { key: 'ArrowUp' });
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('disables buttons', () => {
    render(<NumberInput disabled />);
    expect(screen.getByLabelText('Increase')).toBeDisabled();
    expect(screen.getByLabelText('Decrease')).toBeDisabled();
  });

  it('shows description', () => {
    render(<NumberInput description="Enter a number" />);
    expect(screen.getByText('Enter a number')).toBeInTheDocument();
  });
});
