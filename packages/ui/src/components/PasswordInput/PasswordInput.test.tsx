import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PasswordInput } from './PasswordInput';

describe('PasswordInput', () => {
  it('renders password input', () => {
    render(<PasswordInput placeholder="Password" />);
    const input = screen.getByPlaceholderText('Password');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('toggles visibility', () => {
    render(<PasswordInput placeholder="Password" />);
    const input = screen.getByPlaceholderText('Password');
    const toggle = screen.getByLabelText('Show password');
    fireEvent.click(toggle);
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Hide password')).toBeInTheDocument();
  });

  it('renders label', () => {
    render(<PasswordInput label="Password" />);
    expect(screen.getByText('Password')).toBeInTheDocument();
  });

  it('renders error', () => {
    render(<PasswordInput label="Password" error="Too short" placeholder="pw" />);
    expect(screen.getByText('Too short')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('pw')).toHaveAttribute('aria-invalid', 'true');
  });

  it('renders description', () => {
    render(<PasswordInput description="Min 8 characters" />);
    expect(screen.getByText('Min 8 characters')).toBeInTheDocument();
  });

  it('handles onChange', () => {
    const onChange = vi.fn();
    render(<PasswordInput placeholder="pw" onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('pw'), { target: { value: 'test' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('disables input', () => {
    render(<PasswordInput placeholder="pw" disabled />);
    expect(screen.getByPlaceholderText('pw')).toBeDisabled();
  });
});
