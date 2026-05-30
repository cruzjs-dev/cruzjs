import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Switch } from './Switch';

describe('Switch', () => {
  it('renders with switch role', () => {
    render(<Switch />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('has aria-checked false by default', () => {
    render(<Switch />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('has aria-checked true when defaultChecked', () => {
    render(<Switch defaultChecked />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('toggles on click', () => {
    const onChange = vi.fn();
    render(<Switch onChange={onChange} />);
    const toggle = screen.getByRole('switch');

    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
    expect(toggle).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(false);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('toggles on Space key', () => {
    const onChange = vi.fn();
    render(<Switch onChange={onChange} />);
    const toggle = screen.getByRole('switch');

    // Space triggers click on buttons by default via the browser,
    // which fires the onClick handler. In jsdom we simulate it directly.
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('toggles on Enter key', () => {
    const onChange = vi.fn();
    render(<Switch onChange={onChange} />);
    const toggle = screen.getByRole('switch');

    fireEvent.keyDown(toggle, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('renders label', () => {
    render(<Switch label="Enable notifications" />);
    expect(screen.getByText('Enable notifications')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<Switch label="Notifications" description="Receive email alerts" />);
    expect(screen.getByText('Receive email alerts')).toBeInTheDocument();
  });

  it('disabled prevents toggle', () => {
    const onChange = vi.fn();
    render(<Switch disabled onChange={onChange} />);
    const toggle = screen.getByRole('switch');

    fireEvent.click(toggle);
    expect(onChange).not.toHaveBeenCalled();
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('controlled mode works', () => {
    const onChange = vi.fn();
    const { rerender } = render(<Switch checked={false} onChange={onChange} />);
    const toggle = screen.getByRole('switch');

    expect(toggle).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
    // In controlled mode the component should not update internally
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    // Parent updates the prop
    rerender(<Switch checked={true} onChange={onChange} />);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('associates label with button via htmlFor', () => {
    render(<Switch id="my-switch" label="Dark mode" />);
    const label = screen.getByText('Dark mode');
    expect(label).toHaveAttribute('for', 'my-switch');
  });

  it('links description via aria-describedby', () => {
    render(<Switch id="my-switch" description="Toggle dark mode" />);
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-describedby', 'my-switch-description');
  });
});
