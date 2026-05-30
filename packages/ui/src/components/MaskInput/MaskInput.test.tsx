import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MaskInput } from './MaskInput';

describe('MaskInput', () => {
  it('renders an input element', () => {
    render(<MaskInput mask="(999) 999-9999" />);
    expect(screen.getByTestId('mask-input')).toBeInTheDocument();
  });

  it('renders label', () => {
    render(<MaskInput mask="(999) 999-9999" label="Phone" />);
    expect(screen.getByText('Phone')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<MaskInput mask="(999) 999-9999" label="Phone" description="US number" />);
    expect(screen.getByText('US number')).toBeInTheDocument();
  });

  it('renders error message', () => {
    render(<MaskInput mask="(999) 999-9999" error="Invalid phone" />);
    expect(screen.getByText('Invalid phone')).toBeInTheDocument();
  });

  it('sets aria-invalid on error', () => {
    render(<MaskInput mask="(999) 999-9999" error="Required" />);
    expect(screen.getByTestId('mask-input')).toHaveAttribute('aria-invalid', 'true');
  });

  it('formats input with mask pattern', () => {
    const onChange = vi.fn();
    render(<MaskInput mask="(999) 999-9999" onChange={onChange} />);
    const input = screen.getByTestId('mask-input');
    fireEvent.change(input, { target: { value: '1234567890' } });
    expect(onChange).toHaveBeenCalledWith('(123) 456-7890', '1234567890');
  });

  it('auto-inserts literal characters', () => {
    const onChange = vi.fn();
    render(<MaskInput mask="99/99/9999" onChange={onChange} />);
    const input = screen.getByTestId('mask-input');
    fireEvent.change(input, { target: { value: '12252023' } });
    expect(onChange).toHaveBeenCalledWith('12/25/2023', '12252023');
  });

  it('extracts raw value without literal characters', () => {
    const onChange = vi.fn();
    render(<MaskInput mask="(999) 999-9999" onChange={onChange} />);
    const input = screen.getByTestId('mask-input');
    fireEvent.change(input, { target: { value: '5551234567' } });
    expect(onChange).toHaveBeenCalledWith('(555) 123-4567', '5551234567');
  });

  it('enforces digit-only mask slots', () => {
    const onChange = vi.fn();
    render(<MaskInput mask="999" onChange={onChange} />);
    const input = screen.getByTestId('mask-input');
    fireEvent.change(input, { target: { value: 'a1b2c3' } });
    expect(onChange).toHaveBeenCalledWith('123', '123');
  });

  it('handles backspace by removing last raw character', () => {
    const onChange = vi.fn();
    render(<MaskInput mask="(999) 999-9999" defaultValue="(123) 456-7890" onChange={onChange} />);
    const input = screen.getByTestId('mask-input');
    fireEvent.keyDown(input, { key: 'Backspace' });
    expect(onChange).toHaveBeenCalledWith('(123) 456-789', '123456789');
  });

  it('applies disabled state', () => {
    render(<MaskInput mask="999" disabled />);
    expect(screen.getByTestId('mask-input')).toBeDisabled();
  });

  it('connects label to input via htmlFor', () => {
    render(<MaskInput mask="999" label="Code" id="code-input" />);
    const label = screen.getByText('Code');
    expect(label).toHaveAttribute('for', 'code-input');
  });

  it('generates a placeholder from the mask', () => {
    render(<MaskInput mask="(999) 999-9999" />);
    const input = screen.getByTestId('mask-input');
    expect(input).toHaveAttribute('placeholder', '(___) ___-____');
  });
});
