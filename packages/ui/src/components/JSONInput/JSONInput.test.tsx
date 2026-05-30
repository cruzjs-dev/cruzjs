import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { JSONInput } from './JSONInput';

describe('JSONInput', () => {
  it('renders a textarea', () => {
    render(<JSONInput />);
    expect(screen.getByTestId('json-input-textarea')).toBeInTheDocument();
  });

  it('renders label', () => {
    render(<JSONInput label="Config" />);
    expect(screen.getByText('Config')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<JSONInput label="Config" description="Enter JSON config" />);
    expect(screen.getByText('Enter JSON config')).toBeInTheDocument();
  });

  it('validates valid JSON on change', () => {
    const onChange = vi.fn();
    render(<JSONInput onChange={onChange} />);
    const textarea = screen.getByTestId('json-input-textarea');
    fireEvent.change(textarea, { target: { value: '{"key": "value"}' } });
    expect(onChange).toHaveBeenCalledWith('{"key": "value"}', true);
  });

  it('reports invalid JSON on change', () => {
    const onChange = vi.fn();
    render(<JSONInput onChange={onChange} />);
    const textarea = screen.getByTestId('json-input-textarea');
    fireEvent.change(textarea, { target: { value: '{invalid' } });
    expect(onChange).toHaveBeenCalledWith('{invalid', false);
  });

  it('shows error for invalid JSON', () => {
    render(<JSONInput />);
    const textarea = screen.getByTestId('json-input-textarea');
    fireEvent.change(textarea, { target: { value: '{broken' } });
    expect(screen.getByTestId('json-input-error')).toHaveTextContent('Invalid JSON syntax');
  });

  it('clears validation error when JSON becomes valid', () => {
    render(<JSONInput />);
    const textarea = screen.getByTestId('json-input-textarea');
    fireEvent.change(textarea, { target: { value: '{broken' } });
    expect(screen.getByTestId('json-input-error')).toBeInTheDocument();
    fireEvent.change(textarea, { target: { value: '{"valid": true}' } });
    expect(screen.queryByTestId('json-input-error')).not.toBeInTheDocument();
  });

  it('formats JSON on blur when formatOnBlur is true', () => {
    const onChange = vi.fn();
    render(<JSONInput onChange={onChange} defaultValue='{"a":1,"b":2}' />);
    const textarea = screen.getByTestId('json-input-textarea');
    fireEvent.blur(textarea);
    expect(onChange).toHaveBeenCalledWith(
      '{\n  "a": 1,\n  "b": 2\n}',
      true,
    );
  });

  it('does not format on blur when formatOnBlur is false', () => {
    const onChange = vi.fn();
    render(<JSONInput onChange={onChange} formatOnBlur={false} defaultValue='{"a":1}' />);
    const textarea = screen.getByTestId('json-input-textarea');
    fireEvent.blur(textarea);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows custom error over validation error', () => {
    render(<JSONInput error="Custom error" />);
    const textarea = screen.getByTestId('json-input-textarea');
    fireEvent.change(textarea, { target: { value: '{invalid' } });
    expect(screen.getByTestId('json-input-error')).toHaveTextContent('Custom error');
  });

  it('applies disabled state', () => {
    render(<JSONInput disabled />);
    expect(screen.getByTestId('json-input-textarea')).toBeDisabled();
  });

  it('renders line numbers', () => {
    render(<JSONInput defaultValue={'{\n  "a": 1,\n  "b": 2\n}'} />);
    const lineNumbers = screen.getByTestId('json-input-line-numbers');
    expect(lineNumbers).toBeInTheDocument();
    expect(lineNumbers.textContent).toContain('1');
    expect(lineNumbers.textContent).toContain('4');
  });

  it('sets aria-invalid on error', () => {
    render(<JSONInput error="Bad JSON" />);
    expect(screen.getByTestId('json-input-textarea')).toHaveAttribute('aria-invalid', 'true');
  });

  it('connects label to textarea via htmlFor', () => {
    render(<JSONInput label="JSON" id="json-editor" />);
    const label = screen.getByText('JSON');
    expect(label).toHaveAttribute('for', 'json-editor');
  });

  it('treats empty string as valid', () => {
    const onChange = vi.fn();
    render(<JSONInput onChange={onChange} defaultValue='{"a":1}' />);
    const textarea = screen.getByTestId('json-input-textarea');
    fireEvent.change(textarea, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith('', true);
  });
});
