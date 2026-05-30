import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Burger } from './Burger';

describe('Burger', () => {
  it('renders button with toggle menu label', () => {
    render(<Burger opened={false} />);
    expect(screen.getByRole('button', { name: 'Toggle menu' })).toBeInTheDocument();
  });

  it('has aria-expanded false when closed', () => {
    render(<Burger opened={false} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  });

  it('has aria-expanded true when opened', () => {
    render(<Burger opened={true} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it('calls onToggle on click', () => {
    const onToggle = vi.fn();
    render(<Burger opened={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('calls onToggle with false when opened and clicked', () => {
    const onToggle = vi.fn();
    render(<Burger opened={true} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('renders 3 line spans', () => {
    const { container } = render(<Burger opened={false} />);
    const spans = container.querySelectorAll('span[aria-hidden="true"]');
    expect(spans).toHaveLength(3);
  });

  it('applies size classes', () => {
    const { container: smContainer } = render(<Burger opened={false} size="sm" />);
    const smButton = smContainer.querySelector('button')!;
    expect(smButton.style.width).toBe('28px');
    expect(smButton.style.height).toBe('28px');

    const { container: mdContainer } = render(<Burger opened={false} size="md" />);
    const mdButton = mdContainer.querySelector('button')!;
    expect(mdButton.style.width).toBe('34px');
    expect(mdButton.style.height).toBe('34px');

    const { container: lgContainer } = render(<Burger opened={false} size="lg" />);
    const lgButton = lgContainer.querySelector('button')!;
    expect(lgButton.style.width).toBe('40px');
    expect(lgButton.style.height).toBe('40px');
  });

  it('supports custom className', () => {
    render(<Burger opened={false} className="my-custom-class" />);
    expect(screen.getByRole('button')).toHaveClass('my-custom-class');
  });

  it('forwards ref', () => {
    const ref = vi.fn();
    render(<Burger opened={false} ref={ref} />);
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLButtonElement));
  });

  it('supports custom aria-label', () => {
    render(<Burger opened={false} aria-label="Open sidebar" />);
    expect(screen.getByRole('button', { name: 'Open sidebar' })).toBeInTheDocument();
  });

  it('calls original onClick handler alongside onToggle', () => {
    const onClick = vi.fn();
    const onToggle = vi.fn();
    render(<Burger opened={false} onClick={onClick} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith(true);
  });
});
