import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Input } from './Input';

describe('Input', () => {
  it('renders an input', () => {
    render(<Input placeholder="Type here" />);
    expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument();
  });

  it('renders label', () => {
    render(<Input label="Email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<Input label="Email" description="Your work email" />);
    expect(screen.getByText('Your work email')).toBeInTheDocument();
  });

  it('renders error message', () => {
    render(<Input label="Email" error="Invalid email" />);
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
  });

  it('sets aria-invalid on error', () => {
    render(<Input label="Email" error="Required" placeholder="test" />);
    expect(screen.getByPlaceholderText('test')).toHaveAttribute('aria-invalid', 'true');
  });

  it('handles onChange', () => {
    const onChange = vi.fn();
    render(<Input placeholder="test" onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('test'), { target: { value: 'hello' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('applies disabled state', () => {
    render(<Input placeholder="test" disabled />);
    expect(screen.getByPlaceholderText('test')).toBeDisabled();
  });

  it('connects label to input via htmlFor', () => {
    render(<Input label="Name" id="name-input" />);
    const label = screen.getByText('Name');
    expect(label).toHaveAttribute('for', 'name-input');
  });

  it('renders left addon', () => {
    render(<Input leftAddon="https://" placeholder="url" />);
    expect(screen.getByText('https://')).toBeInTheDocument();
  });

  it('renders right addon', () => {
    render(<Input rightAddon=".com" placeholder="domain" />);
    expect(screen.getByText('.com')).toBeInTheDocument();
  });
});
