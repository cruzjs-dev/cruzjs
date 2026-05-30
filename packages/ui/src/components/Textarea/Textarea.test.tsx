import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Textarea } from './Textarea';

describe('Textarea', () => {
  it('renders a textarea', () => {
    render(<Textarea placeholder="Type here" />);
    expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument();
  });

  it('renders label', () => {
    render(<Textarea label="Message" />);
    expect(screen.getByText('Message')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<Textarea label="Bio" description="Tell us about yourself" />);
    expect(screen.getByText('Tell us about yourself')).toBeInTheDocument();
  });

  it('renders error message', () => {
    render(<Textarea label="Message" error="Required field" />);
    expect(screen.getByText('Required field')).toBeInTheDocument();
  });

  it('sets aria-invalid on error', () => {
    render(<Textarea placeholder="test" error="Required" />);
    expect(screen.getByPlaceholderText('test')).toHaveAttribute('aria-invalid', 'true');
  });

  it('handles onChange', () => {
    const onChange = vi.fn();
    render(<Textarea placeholder="test" onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('test'), { target: { value: 'hello' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('applies disabled state', () => {
    render(<Textarea placeholder="test" disabled />);
    expect(screen.getByPlaceholderText('test')).toBeDisabled();
  });

  it('shows character count with maxLength', () => {
    render(<Textarea value="hello" maxLength={100} onChange={() => {}} />);
    expect(screen.getByText('5/100')).toBeInTheDocument();
  });

  it('shows character count without maxLength when showCount is true', () => {
    render(<Textarea value="test" showCount onChange={() => {}} />);
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('autoResize sets resize-none and overflow-hidden', () => {
    render(<Textarea placeholder="auto" autoResize />);
    const textarea = screen.getByPlaceholderText('auto');
    expect(textarea.className).toContain('resize-none');
    expect(textarea.className).toContain('overflow-hidden');
  });

  it('connects label to textarea via htmlFor', () => {
    render(<Textarea label="Notes" id="notes-input" />);
    const label = screen.getByText('Notes');
    expect(label).toHaveAttribute('for', 'notes-input');
  });

  it('sets aria-describedby when error is present', () => {
    render(<Textarea placeholder="test" error="Oops" id="my-textarea" />);
    const textarea = screen.getByPlaceholderText('test');
    expect(textarea).toHaveAttribute('aria-describedby', 'my-textarea-error');
  });
});
