import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SegmentedControl } from './SegmentedControl';
import type { SegmentedControlItem } from './SegmentedControl';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const items: SegmentedControlItem[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const itemsWithDisabled: SegmentedControlItem[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly', disabled: true },
  { value: 'monthly', label: 'Monthly' },
];

// ─── Rendering ───────────────────────────────────────────────────────────────

describe('SegmentedControl — rendering', () => {
  it('renders all segments with radiogroup and radio roles', () => {
    render(<SegmentedControl data={items} />);
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('first segment is selected by default', () => {
    render(<SegmentedControl data={items} />);
    expect(screen.getByRole('radio', { name: 'Daily' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Weekly' })).toHaveAttribute('aria-checked', 'false');
  });

  it('renders active indicator element', () => {
    render(<SegmentedControl data={items} />);
    expect(screen.getByTestId('segmented-control-indicator')).toBeInTheDocument();
  });

  it('active segment has tabIndex 0; inactive have -1', () => {
    render(<SegmentedControl data={items} defaultValue="weekly" />);
    expect(screen.getByRole('radio', { name: 'Daily' })).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('radio', { name: 'Weekly' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: 'Monthly' })).toHaveAttribute('tabindex', '-1');
  });
});

// ─── onChange ─────────────────────────────────────────────────────────────────

describe('SegmentedControl — onChange', () => {
  it('calls onChange with the segment value on click', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SegmentedControl data={items} onChange={onChange} />);
    await user.click(screen.getByRole('radio', { name: 'Monthly' }));
    expect(onChange).toHaveBeenCalledWith('monthly');
  });

  it('updates active segment on click (uncontrolled)', async () => {
    const user = userEvent.setup();
    render(<SegmentedControl data={items} />);
    await user.click(screen.getByRole('radio', { name: 'Weekly' }));
    expect(screen.getByRole('radio', { name: 'Weekly' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Daily' })).toHaveAttribute('aria-checked', 'false');
  });
});

// ─── Keyboard Navigation ────────────────────────────────────────────────────

describe('SegmentedControl — keyboard navigation', () => {
  it('ArrowRight moves to next segment', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SegmentedControl data={items} onChange={onChange} />);
    screen.getByRole('radio', { name: 'Daily' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Weekly' })).toHaveFocus();
    expect(onChange).toHaveBeenCalledWith('weekly');
  });

  it('ArrowLeft moves to previous segment', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SegmentedControl data={items} defaultValue="weekly" onChange={onChange} />);
    screen.getByRole('radio', { name: 'Weekly' }).focus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('radio', { name: 'Daily' })).toHaveFocus();
    expect(onChange).toHaveBeenCalledWith('daily');
  });

  it('ArrowRight wraps from last to first', async () => {
    const user = userEvent.setup();
    render(<SegmentedControl data={items} defaultValue="monthly" />);
    screen.getByRole('radio', { name: 'Monthly' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Daily' })).toHaveFocus();
  });

  it('ArrowLeft wraps from first to last', async () => {
    const user = userEvent.setup();
    render(<SegmentedControl data={items} />);
    screen.getByRole('radio', { name: 'Daily' }).focus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('radio', { name: 'Monthly' })).toHaveFocus();
  });

  it('skips disabled segments during keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<SegmentedControl data={itemsWithDisabled} />);
    screen.getByRole('radio', { name: 'Daily' }).focus();
    await user.keyboard('{ArrowRight}');
    // Weekly is disabled, should skip to Monthly
    expect(screen.getByRole('radio', { name: 'Monthly' })).toHaveFocus();
  });
});

// ─── Disabled segment ────────────────────────────────────────────────────────

describe('SegmentedControl — disabled segment', () => {
  it('disabled segment has aria-disabled and cannot be clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SegmentedControl data={itemsWithDisabled} onChange={onChange} />);
    const weeklySegment = screen.getByRole('radio', { name: 'Weekly' });
    expect(weeklySegment).toHaveAttribute('aria-disabled', 'true');
    await user.click(weeklySegment);
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ─── Disabled control ────────────────────────────────────────────────────────

describe('SegmentedControl — disabled control', () => {
  it('disabled control has aria-disabled on radiogroup and prevents clicks', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SegmentedControl data={items} disabled onChange={onChange} />);
    expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-disabled', 'true');
    await user.click(screen.getByRole('radio', { name: 'Weekly' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ─── String[] data shorthand ─────────────────────────────────────────────────

describe('SegmentedControl — string[] shorthand', () => {
  it('renders segments from string array', () => {
    render(<SegmentedControl data={['A', 'B', 'C']} />);
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: 'A' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'B' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'C' })).toBeInTheDocument();
  });

  it('uses string as both value and label', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SegmentedControl data={['X', 'Y']} onChange={onChange} />);
    await user.click(screen.getByRole('radio', { name: 'Y' }));
    expect(onChange).toHaveBeenCalledWith('Y');
  });
});

// ─── fullWidth ───────────────────────────────────────────────────────────────

describe('SegmentedControl — fullWidth', () => {
  it('applies full width classes when fullWidth is true', () => {
    render(<SegmentedControl data={items} fullWidth />);
    const radiogroup = screen.getByRole('radiogroup');
    expect(radiogroup.className).toContain('w-full');
  });

  it('segments have flex-1 when fullWidth', () => {
    render(<SegmentedControl data={items} fullWidth />);
    const radios = screen.getAllByRole('radio');
    for (const radio of radios) {
      expect(radio.className).toContain('flex-1');
    }
  });
});

// ─── Sizes ───────────────────────────────────────────────────────────────────

describe('SegmentedControl — sizes', () => {
  it.each<'sm' | 'md' | 'lg'>(['sm', 'md', 'lg'])(
    'renders %s size without crashing',
    (size) => {
      render(<SegmentedControl data={items} size={size} />);
      expect(screen.getByRole('radiogroup')).toBeInTheDocument();
      expect(screen.getAllByRole('radio')).toHaveLength(3);
    },
  );
});

// ─── Colors ──────────────────────────────────────────────────────────────────

describe('SegmentedControl — colors', () => {
  it.each<'primary' | 'success' | 'info'>(['primary', 'success', 'info'])(
    'renders %s color without crashing',
    (color) => {
      render(<SegmentedControl data={items} color={color} />);
      expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    },
  );

  it('indicator has the correct color class', () => {
    render(<SegmentedControl data={items} color="success" />);
    const indicator = screen.getByTestId('segmented-control-indicator');
    expect(indicator.className).toContain('bg-success');
  });
});

// ─── Controlled mode ─────────────────────────────────────────────────────────

describe('SegmentedControl — controlled', () => {
  it('controlled value drives active segment', () => {
    render(<SegmentedControl data={items} value="monthly" onChange={vi.fn()} />);
    expect(screen.getByRole('radio', { name: 'Monthly' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Daily' })).toHaveAttribute('aria-checked', 'false');
  });

  it('clicking calls onChange but does not self-update', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SegmentedControl data={items} value="daily" onChange={onChange} />);
    await user.click(screen.getByRole('radio', { name: 'Weekly' }));
    expect(onChange).toHaveBeenCalledWith('weekly');
    // Without parent re-render, daily remains active
    expect(screen.getByRole('radio', { name: 'Daily' })).toHaveAttribute('aria-checked', 'true');
  });

  it('responds to value prop change via rerender', () => {
    const { rerender } = render(
      <SegmentedControl data={items} value="daily" onChange={vi.fn()} />,
    );
    expect(screen.getByRole('radio', { name: 'Daily' })).toHaveAttribute('aria-checked', 'true');

    rerender(<SegmentedControl data={items} value="monthly" onChange={vi.fn()} />);
    expect(screen.getByRole('radio', { name: 'Monthly' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Daily' })).toHaveAttribute('aria-checked', 'false');
  });
});

// ─── defaultValue ────────────────────────────────────────────────────────────

describe('SegmentedControl — defaultValue', () => {
  it('selects the specified default value', () => {
    render(<SegmentedControl data={items} defaultValue="monthly" />);
    expect(screen.getByRole('radio', { name: 'Monthly' })).toHaveAttribute('aria-checked', 'true');
  });
});
