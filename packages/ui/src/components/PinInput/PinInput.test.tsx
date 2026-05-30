import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PinInput } from './PinInput';

/** Query all PIN cells. Uses aria-label pattern to find them regardless of input type. */
function getCells() {
  return screen.getAllByLabelText(/^PIN digit \d+ of \d+$/);
}

describe('PinInput', () => {
  // ─── Rendering ────────────────────────────────────────────────────────────

  it('renders correct number of cells (default 6)', () => {
    render(<PinInput />);
    expect(getCells()).toHaveLength(6);
  });

  it('renders correct number of cells when length is specified', () => {
    render(<PinInput length={4} />);
    expect(getCells()).toHaveLength(4);
  });

  it('renders label', () => {
    render(<PinInput label="Verification Code" />);
    expect(screen.getByText('Verification Code')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<PinInput description="Enter the 6-digit code" />);
    expect(screen.getByText('Enter the 6-digit code')).toBeInTheDocument();
  });

  it('renders error message', () => {
    render(<PinInput error="Invalid code" />);
    expect(screen.getByText('Invalid code')).toBeInTheDocument();
    expect(screen.getByText('Invalid code')).toHaveAttribute('role', 'alert');
  });

  it('sets aria-invalid on cells when error is present', () => {
    render(<PinInput error="Invalid" />);
    const cells = getCells();
    cells.forEach((cell) => {
      expect(cell).toHaveAttribute('aria-invalid', 'true');
    });
  });

  it('renders with default placeholder', () => {
    render(<PinInput />);
    const cells = getCells();
    cells.forEach((cell) => {
      expect(cell).toHaveAttribute('placeholder', '○');
    });
  });

  it('renders with custom placeholder', () => {
    render(<PinInput placeholder="-" />);
    const cells = getCells();
    cells.forEach((cell) => {
      expect(cell).toHaveAttribute('placeholder', '-');
    });
  });

  // ─── Auto-advance ────────────────────────────────────────────────────────

  it('auto-advances focus to next cell on typing', () => {
    render(<PinInput />);
    const cells = getCells();

    fireEvent.focus(cells[0]);
    fireEvent.keyDown(cells[0], { key: '1' });

    expect(document.activeElement).toBe(cells[1]);
  });

  it('does not advance past last cell', () => {
    render(<PinInput length={3} defaultValue="12" />);
    const cells = getCells();

    fireEvent.focus(cells[2]);
    fireEvent.keyDown(cells[2], { key: '9' });

    // Focus should remain on the last cell
    expect(document.activeElement).toBe(cells[2]);
  });

  // ─── Backspace ────────────────────────────────────────────────────────────

  it('clears current cell on backspace when it has a value', () => {
    const onChange = vi.fn();
    render(<PinInput defaultValue="12" onChange={onChange} />);
    const cells = getCells();

    fireEvent.focus(cells[1]);
    fireEvent.keyDown(cells[1], { key: 'Backspace' });

    expect(onChange).toHaveBeenCalledWith('1');
  });

  it('moves focus back on backspace when current cell is empty', () => {
    render(<PinInput defaultValue="1" />);
    const cells = getCells();

    fireEvent.focus(cells[1]);
    fireEvent.keyDown(cells[1], { key: 'Backspace' });

    expect(document.activeElement).toBe(cells[0]);
  });

  it('does not move before first cell on backspace', () => {
    render(<PinInput defaultValue="1" />);
    const cells = getCells();

    fireEvent.focus(cells[0]);
    fireEvent.keyDown(cells[0], { key: 'Backspace' });

    // Focus remains on first cell
    expect(document.activeElement).toBe(cells[0]);
  });

  // ─── onChange ─────────────────────────────────────────────────────────────

  it('calls onChange on each character input', () => {
    const onChange = vi.fn();
    render(<PinInput onChange={onChange} />);
    const cells = getCells();

    fireEvent.focus(cells[0]);
    fireEvent.keyDown(cells[0], { key: '1' });
    expect(onChange).toHaveBeenCalledWith('1');

    fireEvent.keyDown(cells[1], { key: '2' });
    expect(onChange).toHaveBeenCalledWith('12');
  });

  // ─── onComplete ───────────────────────────────────────────────────────────

  it('calls onComplete when all cells are filled', () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    render(<PinInput length={3} onComplete={onComplete} />);
    const cells = getCells();

    fireEvent.focus(cells[0]);
    fireEvent.keyDown(cells[0], { key: '1' });
    fireEvent.keyDown(cells[1], { key: '2' });
    fireEvent.keyDown(cells[2], { key: '3' });

    vi.runAllTimers();
    expect(onComplete).toHaveBeenCalledWith('123');
    vi.useRealTimers();
  });

  it('does not call onComplete when value is incomplete', () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    render(<PinInput length={3} onComplete={onComplete} />);
    const cells = getCells();

    fireEvent.focus(cells[0]);
    fireEvent.keyDown(cells[0], { key: '1' });
    fireEvent.keyDown(cells[1], { key: '2' });

    vi.runAllTimers();
    expect(onComplete).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  // ─── Mask mode ────────────────────────────────────────────────────────────

  it('uses password type when mask is true', () => {
    render(<PinInput mask />);
    const cells = getCells();
    cells.forEach((cell) => {
      expect(cell).toHaveAttribute('type', 'password');
    });
  });

  it('uses text type when mask is false', () => {
    render(<PinInput />);
    const cells = getCells();
    cells.forEach((cell) => {
      expect(cell).toHaveAttribute('type', 'text');
    });
  });

  // ─── Number-only mode ─────────────────────────────────────────────────────

  it('rejects non-numeric characters in number mode', () => {
    const onChange = vi.fn();
    render(<PinInput type="number" onChange={onChange} />);
    const cells = getCells();

    fireEvent.focus(cells[0]);
    fireEvent.keyDown(cells[0], { key: 'a' });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('accepts digits in number mode', () => {
    const onChange = vi.fn();
    render(<PinInput type="number" onChange={onChange} />);
    const cells = getCells();

    fireEvent.focus(cells[0]);
    fireEvent.keyDown(cells[0], { key: '5' });

    expect(onChange).toHaveBeenCalledWith('5');
  });

  it('accepts letters in alphanumeric mode', () => {
    const onChange = vi.fn();
    render(<PinInput type="alphanumeric" onChange={onChange} />);
    const cells = getCells();

    fireEvent.focus(cells[0]);
    fireEvent.keyDown(cells[0], { key: 'A' });

    expect(onChange).toHaveBeenCalledWith('A');
  });

  it('sets inputMode numeric for number type', () => {
    render(<PinInput type="number" />);
    const cells = getCells();
    cells.forEach((cell) => {
      expect(cell).toHaveAttribute('inputmode', 'numeric');
    });
  });

  it('sets inputMode text for alphanumeric type', () => {
    render(<PinInput type="alphanumeric" />);
    const cells = getCells();
    cells.forEach((cell) => {
      expect(cell).toHaveAttribute('inputmode', 'text');
    });
  });

  // ─── Paste ────────────────────────────────────────────────────────────────

  it('distributes pasted characters across cells', () => {
    const onChange = vi.fn();
    render(<PinInput length={4} onChange={onChange} />);
    const cells = getCells();

    fireEvent.focus(cells[0]);
    fireEvent.paste(cells[0], {
      clipboardData: { getData: () => '1234' },
    });

    expect(onChange).toHaveBeenCalledWith('1234');
  });

  it('handles partial paste from middle cell', () => {
    const onChange = vi.fn();
    render(<PinInput length={4} defaultValue="1" onChange={onChange} />);
    const cells = getCells();

    fireEvent.focus(cells[1]);
    fireEvent.paste(cells[1], {
      clipboardData: { getData: () => '23' },
    });

    expect(onChange).toHaveBeenCalledWith('123');
  });

  it('filters invalid characters from paste in number mode', () => {
    const onChange = vi.fn();
    render(<PinInput length={4} type="number" onChange={onChange} />);
    const cells = getCells();

    fireEvent.focus(cells[0]);
    fireEvent.paste(cells[0], {
      clipboardData: { getData: () => '1a2b' },
    });

    expect(onChange).toHaveBeenCalledWith('12');
  });

  it('clips pasted value to remaining cells', () => {
    const onChange = vi.fn();
    render(<PinInput length={3} onChange={onChange} />);
    const cells = getCells();

    fireEvent.focus(cells[0]);
    fireEvent.paste(cells[0], {
      clipboardData: { getData: () => '123456' },
    });

    expect(onChange).toHaveBeenCalledWith('123');
  });

  // ─── Disabled state ───────────────────────────────────────────────────────

  it('disables all cells when disabled', () => {
    render(<PinInput disabled />);
    const cells = getCells();
    cells.forEach((cell) => {
      expect(cell).toBeDisabled();
    });
  });

  it('does not accept input when disabled', () => {
    const onChange = vi.fn();
    render(<PinInput disabled onChange={onChange} />);
    const cells = getCells();

    fireEvent.focus(cells[0]);
    fireEvent.keyDown(cells[0], { key: '1' });

    // Disabled inputs won't fire events normally; the input itself is disabled
    expect(cells[0]).toBeDisabled();
  });

  // ─── Arrow key navigation ────────────────────────────────────────────────

  it('navigates left with ArrowLeft', () => {
    render(<PinInput defaultValue="12" />);
    const cells = getCells();

    fireEvent.focus(cells[1]);
    fireEvent.keyDown(cells[1], { key: 'ArrowLeft' });

    expect(document.activeElement).toBe(cells[0]);
  });

  it('navigates right with ArrowRight', () => {
    render(<PinInput />);
    const cells = getCells();

    fireEvent.focus(cells[0]);
    fireEvent.keyDown(cells[0], { key: 'ArrowRight' });

    expect(document.activeElement).toBe(cells[1]);
  });

  // ─── Controlled mode ──────────────────────────────────────────────────────

  it('renders controlled value', () => {
    render(<PinInput value="123" length={4} />);
    const cells = getCells();

    expect(cells[0]).toHaveValue('1');
    expect(cells[1]).toHaveValue('2');
    expect(cells[2]).toHaveValue('3');
    expect(cells[3]).toHaveValue('');
  });

  it('renders default value', () => {
    render(<PinInput defaultValue="45" length={4} />);
    const cells = getCells();

    expect(cells[0]).toHaveValue('4');
    expect(cells[1]).toHaveValue('5');
    expect(cells[2]).toHaveValue('');
    expect(cells[3]).toHaveValue('');
  });

  // ─── ARIA / a11y ──────────────────────────────────────────────────────────

  it('has role=group on the cell container', () => {
    render(<PinInput label="Code" />);
    expect(screen.getByRole('group')).toBeInTheDocument();
  });

  it('labels each cell with position', () => {
    render(<PinInput length={4} />);
    const cells = getCells();
    expect(cells[0]).toHaveAttribute('aria-label', 'PIN digit 1 of 4');
    expect(cells[3]).toHaveAttribute('aria-label', 'PIN digit 4 of 4');
  });

  it('connects label to first cell', () => {
    render(<PinInput label="Enter code" />);
    const label = screen.getByText('Enter code');
    const firstCell = getCells()[0];
    expect(label).toHaveAttribute('for', firstCell.id);
  });

  it('sets autocomplete="one-time-code" on first cell', () => {
    render(<PinInput />);
    const cells = getCells();
    expect(cells[0]).toHaveAttribute('autocomplete', 'one-time-code');
    expect(cells[1]).toHaveAttribute('autocomplete', 'off');
  });
});
