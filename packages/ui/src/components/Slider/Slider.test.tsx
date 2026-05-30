import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Slider } from './Slider';

describe('Slider', () => {
  it('renders with slider role', () => {
    render(<Slider />);
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('has correct aria-valuenow', () => {
    render(<Slider value={42} />);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '42');
  });

  it('has correct aria-valuemin and aria-valuemax', () => {
    render(<Slider min={10} max={200} />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuemin', '10');
    expect(slider).toHaveAttribute('aria-valuemax', '200');
  });

  it('uses default aria-valuemin=0 and aria-valuemax=100', () => {
    render(<Slider />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '100');
  });

  it('renders label text', () => {
    render(<Slider label="Volume" />);
    expect(screen.getByText('Volume')).toBeInTheDocument();
  });

  it('shows value when showValue is true', () => {
    render(<Slider value={75} showValue />);
    expect(screen.getByText('75')).toBeInTheDocument();
  });

  it('applies disabled state', () => {
    render(<Slider disabled />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('tabindex', '-1');
  });

  it('increments value with ArrowRight key', () => {
    const onChange = vi.fn();
    render(<Slider defaultValue={50} step={5} onChange={onChange} />);
    const slider = screen.getByRole('slider');

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith(55);
  });

  it('decrements value with ArrowLeft key', () => {
    const onChange = vi.fn();
    render(<Slider defaultValue={50} step={5} onChange={onChange} />);
    const slider = screen.getByRole('slider');

    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith(45);
  });

  it('does not exceed max with ArrowRight', () => {
    const onChange = vi.fn();
    render(<Slider defaultValue={98} max={100} step={5} onChange={onChange} />);
    const slider = screen.getByRole('slider');

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith(100);
  });

  it('does not go below min with ArrowLeft', () => {
    const onChange = vi.fn();
    render(<Slider defaultValue={2} min={0} step={5} onChange={onChange} />);
    const slider = screen.getByRole('slider');

    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('controlled mode reflects external value', () => {
    const onChange = vi.fn();
    const { rerender } = render(<Slider value={30} onChange={onChange} />);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '30');

    // Keyboard press fires onChange but does not change internal state
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith(31);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '30');

    // Parent updates
    rerender(<Slider value={31} onChange={onChange} />);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '31');
  });

  it('disabled prevents keyboard interaction', () => {
    const onChange = vi.fn();
    render(<Slider disabled defaultValue={50} onChange={onChange} />);
    const slider = screen.getByRole('slider');

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('sets aria-label from string label', () => {
    render(<Slider label="Brightness" />);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-label', 'Brightness');
  });

  it('Home key sets value to min', () => {
    const onChange = vi.fn();
    render(<Slider defaultValue={50} min={10} onChange={onChange} />);
    const slider = screen.getByRole('slider');

    fireEvent.keyDown(slider, { key: 'Home' });
    expect(onChange).toHaveBeenCalledWith(10);
  });

  it('End key sets value to max', () => {
    const onChange = vi.fn();
    render(<Slider defaultValue={50} max={200} onChange={onChange} />);
    const slider = screen.getByRole('slider');

    fireEvent.keyDown(slider, { key: 'End' });
    expect(onChange).toHaveBeenCalledWith(200);
  });
});
