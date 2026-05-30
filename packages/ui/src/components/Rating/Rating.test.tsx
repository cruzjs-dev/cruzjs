import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Rating } from './Rating';

describe('Rating', () => {
  it('renders the correct number of stars (default 5)', () => {
    render(<Rating />);
    expect(screen.getByRole('slider')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^rating-star-/)).toHaveLength(5);
  });

  it('renders custom count of stars', () => {
    render(<Rating count={10} />);
    expect(screen.getAllByTestId(/^rating-star-/)).toHaveLength(10);
  });

  it('has correct aria-valuenow for controlled value', () => {
    render(<Rating value={3} />);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '3');
  });

  it('has correct aria-valuemin and aria-valuemax', () => {
    render(<Rating count={7} />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '7');
  });

  it('defaults aria-valuemax to 5', () => {
    render(<Rating />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '5');
  });

  it('uses defaultValue for uncontrolled mode', () => {
    render(<Rating defaultValue={4} />);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '4');
  });

  it('calls onChange when a star is clicked', () => {
    const onChange = vi.fn();
    render(<Rating onChange={onChange} />);

    // Click the 3rd star (index 2)
    const star = screen.getByTestId('rating-star-2');
    // Simulate a click on the right half of the star
    const rect = { left: 0, width: 24 };
    Object.defineProperty(star, 'getBoundingClientRect', {
      value: () => rect,
    });
    fireEvent.click(star, { clientX: 20 });

    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('updates internal value on click in uncontrolled mode', () => {
    const onChange = vi.fn();
    render(<Rating defaultValue={1} onChange={onChange} />);

    const star = screen.getByTestId('rating-star-3');
    Object.defineProperty(star, 'getBoundingClientRect', {
      value: () => ({ left: 0, width: 24 }),
    });
    fireEvent.click(star, { clientX: 20 });

    expect(onChange).toHaveBeenCalledWith(4);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '4');
  });

  it('hover previews rating via mouseMove', () => {
    render(<Rating defaultValue={1} />);

    const star = screen.getByTestId('rating-star-3');
    Object.defineProperty(star, 'getBoundingClientRect', {
      value: () => ({ left: 0, width: 24 }),
    });
    fireEvent.mouseMove(star, { clientX: 20 });

    // Internal value should still be 1 (hover preview only)
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '1');
  });

  it('supports half-star clicks with allowHalf', () => {
    const onChange = vi.fn();
    render(<Rating allowHalf onChange={onChange} />);

    const star = screen.getByTestId('rating-star-2');
    Object.defineProperty(star, 'getBoundingClientRect', {
      value: () => ({ left: 0, width: 24 }),
    });
    // Click left half
    fireEvent.click(star, { clientX: 5 });
    expect(onChange).toHaveBeenCalledWith(2.5);
  });

  it('supports full-star clicks with allowHalf on right side', () => {
    const onChange = vi.fn();
    render(<Rating allowHalf onChange={onChange} />);

    const star = screen.getByTestId('rating-star-2');
    Object.defineProperty(star, 'getBoundingClientRect', {
      value: () => ({ left: 0, width: 24 }),
    });
    // Click right half
    fireEvent.click(star, { clientX: 20 });
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('does not call onChange when readOnly', () => {
    const onChange = vi.fn();
    render(<Rating readOnly value={3} onChange={onChange} />);

    const star = screen.getByTestId('rating-star-1');
    Object.defineProperty(star, 'getBoundingClientRect', {
      value: () => ({ left: 0, width: 24 }),
    });
    fireEvent.click(star, { clientX: 20 });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not call onChange when disabled', () => {
    const onChange = vi.fn();
    render(<Rating disabled value={2} onChange={onChange} />);

    const star = screen.getByTestId('rating-star-0');
    Object.defineProperty(star, 'getBoundingClientRect', {
      value: () => ({ left: 0, width: 24 }),
    });
    fireEvent.click(star, { clientX: 20 });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('applies disabled state with tabIndex -1', () => {
    render(<Rating disabled />);
    expect(screen.getByRole('slider')).toHaveAttribute('tabindex', '-1');
  });

  it('applies aria-disabled when disabled', () => {
    render(<Rating disabled />);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-disabled', 'true');
  });

  it('applies aria-readonly when readOnly', () => {
    render(<Rating readOnly />);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-readonly', 'true');
  });

  it('increments value with ArrowRight key', () => {
    const onChange = vi.fn();
    render(<Rating defaultValue={2} onChange={onChange} />);
    const slider = screen.getByRole('slider');

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('decrements value with ArrowLeft key', () => {
    const onChange = vi.fn();
    render(<Rating defaultValue={3} onChange={onChange} />);
    const slider = screen.getByRole('slider');

    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('does not exceed max with ArrowRight', () => {
    const onChange = vi.fn();
    render(<Rating defaultValue={5} onChange={onChange} />);
    const slider = screen.getByRole('slider');

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('does not go below 0 with ArrowLeft', () => {
    const onChange = vi.fn();
    render(<Rating defaultValue={0} onChange={onChange} />);
    const slider = screen.getByRole('slider');

    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('increments by 0.5 with ArrowRight when allowHalf', () => {
    const onChange = vi.fn();
    render(<Rating defaultValue={2} allowHalf onChange={onChange} />);
    const slider = screen.getByRole('slider');

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith(2.5);
  });

  it('decrements by 0.5 with ArrowLeft when allowHalf', () => {
    const onChange = vi.fn();
    render(<Rating defaultValue={3} allowHalf onChange={onChange} />);
    const slider = screen.getByRole('slider');

    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith(2.5);
  });

  it('Home key sets value to 0', () => {
    const onChange = vi.fn();
    render(<Rating defaultValue={4} onChange={onChange} />);
    const slider = screen.getByRole('slider');

    fireEvent.keyDown(slider, { key: 'Home' });
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('End key sets value to max', () => {
    const onChange = vi.fn();
    render(<Rating defaultValue={2} count={7} onChange={onChange} />);
    const slider = screen.getByRole('slider');

    fireEvent.keyDown(slider, { key: 'End' });
    expect(onChange).toHaveBeenCalledWith(7);
  });

  it('keyboard does not work when disabled', () => {
    const onChange = vi.fn();
    render(<Rating disabled defaultValue={3} onChange={onChange} />);
    const slider = screen.getByRole('slider');

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keyboard does not work when readOnly', () => {
    const onChange = vi.fn();
    render(<Rating readOnly value={3} onChange={onChange} />);
    const slider = screen.getByRole('slider');

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('controlled mode reflects external value', () => {
    const onChange = vi.fn();
    const { rerender } = render(<Rating value={2} onChange={onChange} />);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '2');

    // Keyboard fires onChange but does not change aria-valuenow
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith(3);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '2');

    // Parent updates
    rerender(<Rating value={3} onChange={onChange} />);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '3');
  });

  it('renders with sm size', () => {
    render(<Rating size="sm" />);
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('renders with lg size', () => {
    render(<Rating size="lg" />);
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('renders with primary color', () => {
    render(<Rating color="primary" value={3} />);
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('renders with danger color', () => {
    render(<Rating color="danger" value={3} />);
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('renders with warning color (default)', () => {
    render(<Rating value={3} />);
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('supports custom className', () => {
    render(<Rating className="my-custom-class" />);
    expect(screen.getByRole('slider')).toHaveClass('my-custom-class');
  });

  it('supports custom icon', () => {
    const heartIcon = <span data-testid="heart-icon">heart</span>;
    render(<Rating icon={heartIcon} value={3} />);
    // Custom icon is rendered for each star
    expect(screen.getAllByTestId('heart-icon').length).toBeGreaterThan(0);
  });
});
