import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ColorPicker } from './ColorPicker';

function mockMatchMedia(matches = false) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('ColorPicker', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it('renders trigger with current color', () => {
    render(<ColorPicker defaultValue="#ff0000" />);
    const trigger = screen.getByTestId('colorpicker-trigger');
    expect(trigger).toBeInTheDocument();
    expect(trigger.style.backgroundColor).toBe('rgb(255, 0, 0)');
  });

  it('renders label', () => {
    render(<ColorPicker label="Background Color" />);
    expect(screen.getByText('Background Color')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<ColorPicker label="Color" description="Pick a theme color" />);
    expect(screen.getByText('Pick a theme color')).toBeInTheDocument();
  });

  it('opens panel on click', () => {
    render(<ColorPicker defaultValue="#00ff00" />);
    expect(screen.queryByTestId('colorpicker-panel')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('colorpicker-trigger'));
    expect(screen.getByTestId('colorpicker-panel')).toBeInTheDocument();
  });

  it('closes panel on Escape', () => {
    render(<ColorPicker />);
    fireEvent.click(screen.getByTestId('colorpicker-trigger'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('hex input updates color', () => {
    const onChange = vi.fn();
    render(<ColorPicker defaultValue="#ff0000" onChange={onChange} />);
    fireEvent.click(screen.getByTestId('colorpicker-trigger'));

    const input = screen.getByTestId('color-text-input');
    fireEvent.change(input, { target: { value: '#00ff00' } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith('#00ff00');
  });

  it('hex input with Enter key commits value', () => {
    const onChange = vi.fn();
    render(<ColorPicker defaultValue="#ff0000" onChange={onChange} />);
    fireEvent.click(screen.getByTestId('colorpicker-trigger'));

    const input = screen.getByTestId('color-text-input');
    fireEvent.change(input, { target: { value: '#0000ff' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('#0000ff');
  });

  it('invalid hex input resets on blur', () => {
    render(<ColorPicker defaultValue="#ff0000" />);
    fireEvent.click(screen.getByTestId('colorpicker-trigger'));

    const input = screen.getByTestId('color-text-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'notacolor' } });
    fireEvent.blur(input);

    // Should reset to current color
    expect(input.value).toBe('#ff0000');
  });

  it('swatch click selects color', () => {
    const onChange = vi.fn();
    const swatches = ['#ff0000', '#00ff00', '#0000ff'];
    render(<ColorPicker defaultValue="#000000" onChange={onChange} swatches={swatches} />);
    fireEvent.click(screen.getByTestId('colorpicker-trigger'));

    const swatchGrid = screen.getByTestId('swatches-grid');
    expect(swatchGrid).toBeInTheDocument();

    const blueBtn = screen.getByLabelText('Select color #0000ff');
    fireEvent.click(blueBtn);

    expect(onChange).toHaveBeenCalledWith('#0000ff');
  });

  it('onChange fires with correct format (hex)', () => {
    const onChange = vi.fn();
    render(<ColorPicker defaultValue="#ff0000" format="hex" onChange={onChange} />);
    fireEvent.click(screen.getByTestId('colorpicker-trigger'));

    const input = screen.getByTestId('color-text-input');
    fireEvent.change(input, { target: { value: '#abcdef' } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith('#abcdef');
  });

  it('onChange fires with correct format (rgb)', () => {
    const onChange = vi.fn();
    render(<ColorPicker defaultValue="#ff0000" format="rgb" onChange={onChange} />);
    fireEvent.click(screen.getByTestId('colorpicker-trigger'));

    const input = screen.getByTestId('color-text-input');
    fireEvent.change(input, { target: { value: '#00ff00' } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith('rgb(0, 255, 0)');
  });

  it('disabled state prevents opening', () => {
    render(<ColorPicker disabled />);
    const trigger = screen.getByTestId('colorpicker-trigger');
    expect(trigger).toBeDisabled();

    fireEvent.click(trigger);
    expect(screen.queryByTestId('colorpicker-panel')).not.toBeInTheDocument();
  });

  it('error message displays', () => {
    render(<ColorPicker error="Color is required" />);
    expect(screen.getByText('Color is required')).toBeInTheDocument();
  });

  it('controlled value reflects external changes', () => {
    const onChange = vi.fn();
    const { rerender } = render(<ColorPicker value="#ff0000" onChange={onChange} />);
    const trigger = screen.getByTestId('colorpicker-trigger');
    expect(trigger.style.backgroundColor).toBe('rgb(255, 0, 0)');

    rerender(<ColorPicker value="#00ff00" onChange={onChange} />);
    expect(trigger.style.backgroundColor).toBe('rgb(0, 255, 0)');
  });

  it('sets aria-expanded on trigger', () => {
    render(<ColorPicker />);
    const trigger = screen.getByTestId('colorpicker-trigger');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('sets aria-haspopup on trigger', () => {
    render(<ColorPicker />);
    expect(screen.getByTestId('colorpicker-trigger')).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('toggles panel on repeated clicks', () => {
    render(<ColorPicker />);
    const trigger = screen.getByTestId('colorpicker-trigger');

    fireEvent.click(trigger);
    expect(screen.getByTestId('colorpicker-panel')).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.queryByTestId('colorpicker-panel')).not.toBeInTheDocument();
  });

  it('displays color preview in panel', () => {
    render(<ColorPicker defaultValue="#ff6600" />);
    fireEvent.click(screen.getByTestId('colorpicker-trigger'));

    const preview = screen.getByTestId('color-preview');
    expect(preview).toBeInTheDocument();
    expect(preview.style.backgroundColor).toBe('rgb(255, 102, 0)');
  });

  it('renders saturation canvas and hue slider', () => {
    render(<ColorPicker />);
    fireEvent.click(screen.getByTestId('colorpicker-trigger'));

    expect(screen.getByTestId('saturation-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('hue-slider')).toBeInTheDocument();
  });

  it('does not render swatches when none provided', () => {
    render(<ColorPicker />);
    fireEvent.click(screen.getByTestId('colorpicker-trigger'));

    expect(screen.queryByTestId('swatches-grid')).not.toBeInTheDocument();
  });

  it('accepts rgb() string in text input', () => {
    const onChange = vi.fn();
    render(<ColorPicker defaultValue="#000000" format="hex" onChange={onChange} />);
    fireEvent.click(screen.getByTestId('colorpicker-trigger'));

    const input = screen.getByTestId('color-text-input');
    fireEvent.change(input, { target: { value: 'rgb(128, 0, 255)' } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith('#8000ff');
  });
});
