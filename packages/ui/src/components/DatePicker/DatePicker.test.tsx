import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DatePicker } from './DatePicker';

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

describe('DatePicker', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it('renders trigger with placeholder when no value', () => {
    render(<DatePicker placeholder="Pick a date" />);
    const trigger = screen.getByTestId('datepicker-trigger');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('Pick a date');
  });

  it('renders trigger with formatted date when value is set', () => {
    const date = new Date(2026, 2, 15); // March 15, 2026
    render(<DatePicker defaultValue={date} />);
    const trigger = screen.getByTestId('datepicker-trigger');
    // Intl.DateTimeFormat with en-US long date format
    expect(trigger).toHaveTextContent('March 15, 2026');
  });

  it('renders label', () => {
    render(<DatePicker label="Start Date" />);
    expect(screen.getByText('Start Date')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<DatePicker label="Date" description="Choose a start date" />);
    expect(screen.getByText('Choose a start date')).toBeInTheDocument();
  });

  it('opens calendar on click', () => {
    render(<DatePicker />);
    expect(screen.queryByTestId('datepicker-panel')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('datepicker-trigger'));
    expect(screen.getByTestId('datepicker-panel')).toBeInTheDocument();
  });

  it('shows current month when opened without value', () => {
    render(<DatePicker />);
    fireEvent.click(screen.getByTestId('datepicker-trigger'));

    const now = new Date();
    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(now);
    expect(screen.getByTestId('datepicker-month-label')).toHaveTextContent(monthName);
    expect(screen.getByTestId('datepicker-year-label')).toHaveTextContent(String(now.getFullYear()));
  });

  it('selects date on click and fires onChange', () => {
    const onChange = vi.fn();
    // Open with January 2026 visible
    const jan15 = new Date(2026, 0, 15);
    render(<DatePicker defaultValue={jan15} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('datepicker-trigger'));

    // Click on day 20 (January 20, 2026)
    const day20 = screen.getByRole('gridcell', { name: /January 20, 2026/ });
    fireEvent.click(day20);

    expect(onChange).toHaveBeenCalledTimes(1);
    const selected = onChange.mock.calls[0][0] as Date;
    expect(selected.getFullYear()).toBe(2026);
    expect(selected.getMonth()).toBe(0);
    expect(selected.getDate()).toBe(20);
  });

  it('onChange fires with selected date', () => {
    const onChange = vi.fn();
    const date = new Date(2026, 5, 10); // June 10, 2026
    render(<DatePicker defaultValue={date} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('datepicker-trigger'));

    const day15 = screen.getByRole('gridcell', { name: /June 15, 2026/ });
    fireEvent.click(day15);

    expect(onChange).toHaveBeenCalledTimes(1);
    const result = onChange.mock.calls[0][0] as Date;
    expect(result.getDate()).toBe(15);
    expect(result.getMonth()).toBe(5);
  });

  it('navigates to previous month', () => {
    const feb = new Date(2026, 1, 10); // February 2026
    render(<DatePicker defaultValue={feb} />);
    fireEvent.click(screen.getByTestId('datepicker-trigger'));

    expect(screen.getByTestId('datepicker-month-label')).toHaveTextContent('February');

    fireEvent.click(screen.getByTestId('datepicker-prev-month'));
    expect(screen.getByTestId('datepicker-month-label')).toHaveTextContent('January');
  });

  it('navigates to next month', () => {
    const nov = new Date(2026, 10, 5); // November 2026
    render(<DatePicker defaultValue={nov} />);
    fireEvent.click(screen.getByTestId('datepicker-trigger'));

    expect(screen.getByTestId('datepicker-month-label')).toHaveTextContent('November');

    fireEvent.click(screen.getByTestId('datepicker-next-month'));
    expect(screen.getByTestId('datepicker-month-label')).toHaveTextContent('December');
  });

  it('highlights today with a subtle ring', () => {
    render(<DatePicker />);
    fireEvent.click(screen.getByTestId('datepicker-trigger'));

    const todayCell = screen.getByTestId('datepicker-grid').querySelector('[data-today]');
    expect(todayCell).toBeInTheDocument();
    expect(todayCell).toHaveTextContent(String(new Date().getDate()));
  });

  it('disables dates outside min/max range', () => {
    const minDate = new Date(2026, 0, 10); // Jan 10
    const maxDate = new Date(2026, 0, 20); // Jan 20
    const jan15 = new Date(2026, 0, 15);

    render(<DatePicker defaultValue={jan15} minDate={minDate} maxDate={maxDate} />);
    fireEvent.click(screen.getByTestId('datepicker-trigger'));

    // Day 5 should be disabled (before minDate)
    const day5 = screen.getByRole('gridcell', { name: /January 5, 2026/ });
    expect(day5).toBeDisabled();
    expect(day5).toHaveAttribute('aria-disabled', 'true');

    // Day 15 should be enabled (within range)
    const day15 = screen.getByRole('gridcell', { name: /January 15, 2026/ });
    expect(day15).not.toBeDisabled();

    // Day 25 should be disabled (after maxDate)
    const day25 = screen.getByRole('gridcell', { name: /January 25, 2026/ });
    expect(day25).toBeDisabled();
  });

  it('does not fire onChange when clicking disabled date', () => {
    const onChange = vi.fn();
    const minDate = new Date(2026, 0, 10);
    const jan15 = new Date(2026, 0, 15);

    render(<DatePicker defaultValue={jan15} minDate={minDate} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('datepicker-trigger'));

    const day5 = screen.getByRole('gridcell', { name: /January 5, 2026/ });
    fireEvent.click(day5);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('clearable button clears the value', () => {
    const onChange = vi.fn();
    const date = new Date(2026, 3, 20);
    render(<DatePicker defaultValue={date} clearable onChange={onChange} />);

    const trigger = screen.getByTestId('datepicker-trigger');
    expect(trigger).toHaveTextContent('April 20, 2026');

    const clearBtn = screen.getByTestId('datepicker-clear');
    fireEvent.click(clearBtn);

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('does not show clear button when no value', () => {
    render(<DatePicker clearable />);
    expect(screen.queryByTestId('datepicker-clear')).not.toBeInTheDocument();
  });

  it('disabled state prevents opening', () => {
    render(<DatePicker disabled />);
    const trigger = screen.getByTestId('datepicker-trigger');
    expect(trigger).toBeDisabled();

    fireEvent.click(trigger);
    expect(screen.queryByTestId('datepicker-panel')).not.toBeInTheDocument();
  });

  it('controlled value reflects external changes', () => {
    const onChange = vi.fn();
    const date1 = new Date(2026, 0, 1);
    const date2 = new Date(2026, 6, 4);

    const { rerender } = render(<DatePicker value={date1} onChange={onChange} />);
    expect(screen.getByTestId('datepicker-trigger')).toHaveTextContent('January 1, 2026');

    rerender(<DatePicker value={date2} onChange={onChange} />);
    expect(screen.getByTestId('datepicker-trigger')).toHaveTextContent('July 4, 2026');
  });

  it('controlled value null shows placeholder', () => {
    render(<DatePicker value={null} placeholder="No date" />);
    expect(screen.getByTestId('datepicker-trigger')).toHaveTextContent('No date');
  });

  it('keyboard ArrowRight moves focus to next day', () => {
    const jan15 = new Date(2026, 0, 15);
    render(<DatePicker defaultValue={jan15} />);
    fireEvent.click(screen.getByTestId('datepicker-trigger'));

    const panel = screen.getByTestId('datepicker-panel');
    fireEvent.keyDown(panel, { key: 'ArrowRight' });

    // The focused date should now be Jan 16
    const jan16Cell = screen.getByRole('gridcell', { name: /January 16, 2026/ });
    expect(jan16Cell).toHaveAttribute('tabIndex', '0');
  });

  it('keyboard ArrowLeft moves focus to previous day', () => {
    const jan15 = new Date(2026, 0, 15);
    render(<DatePicker defaultValue={jan15} />);
    fireEvent.click(screen.getByTestId('datepicker-trigger'));

    const panel = screen.getByTestId('datepicker-panel');
    fireEvent.keyDown(panel, { key: 'ArrowLeft' });

    const jan14Cell = screen.getByRole('gridcell', { name: /January 14, 2026/ });
    expect(jan14Cell).toHaveAttribute('tabIndex', '0');
  });

  it('keyboard ArrowDown moves focus one week forward', () => {
    const jan15 = new Date(2026, 0, 15);
    render(<DatePicker defaultValue={jan15} />);
    fireEvent.click(screen.getByTestId('datepicker-trigger'));

    const panel = screen.getByTestId('datepicker-panel');
    fireEvent.keyDown(panel, { key: 'ArrowDown' });

    const jan22Cell = screen.getByRole('gridcell', { name: /January 22, 2026/ });
    expect(jan22Cell).toHaveAttribute('tabIndex', '0');
  });

  it('keyboard ArrowUp moves focus one week back', () => {
    const jan15 = new Date(2026, 0, 15);
    render(<DatePicker defaultValue={jan15} />);
    fireEvent.click(screen.getByTestId('datepicker-trigger'));

    const panel = screen.getByTestId('datepicker-panel');
    fireEvent.keyDown(panel, { key: 'ArrowUp' });

    const jan8Cell = screen.getByRole('gridcell', { name: /January 8, 2026/ });
    expect(jan8Cell).toHaveAttribute('tabIndex', '0');
  });

  it('keyboard Enter selects focused date', () => {
    const onChange = vi.fn();
    const jan15 = new Date(2026, 0, 15);
    render(<DatePicker defaultValue={jan15} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('datepicker-trigger'));

    const panel = screen.getByTestId('datepicker-panel');
    // Move to Jan 16
    fireEvent.keyDown(panel, { key: 'ArrowRight' });
    // Select
    fireEvent.keyDown(panel, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledTimes(1);
    const selected = onChange.mock.calls[0][0] as Date;
    expect(selected.getDate()).toBe(16);
  });

  it('keyboard Escape closes calendar', () => {
    render(<DatePicker />);
    fireEvent.click(screen.getByTestId('datepicker-trigger'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('error message displays', () => {
    render(<DatePicker error="Date is required" />);
    expect(screen.getByText('Date is required')).toBeInTheDocument();
    expect(screen.getByTestId('datepicker-error')).toBeInTheDocument();
  });

  it('sets aria-expanded on trigger', () => {
    render(<DatePicker />);
    const trigger = screen.getByTestId('datepicker-trigger');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('toggles panel on repeated clicks', () => {
    render(<DatePicker />);
    const trigger = screen.getByTestId('datepicker-trigger');

    fireEvent.click(trigger);
    expect(screen.getByTestId('datepicker-panel')).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.queryByTestId('datepicker-panel')).not.toBeInTheDocument();
  });

  it('month picker grid appears when clicking month label', () => {
    const jan15 = new Date(2026, 0, 15);
    render(<DatePicker defaultValue={jan15} />);
    fireEvent.click(screen.getByTestId('datepicker-trigger'));

    fireEvent.click(screen.getByTestId('datepicker-month-label'));
    expect(screen.getByTestId('datepicker-months-grid')).toBeInTheDocument();
    expect(screen.queryByTestId('datepicker-days-grid')).not.toBeInTheDocument();
  });

  it('year picker grid appears when clicking year label', () => {
    const jan15 = new Date(2026, 0, 15);
    render(<DatePicker defaultValue={jan15} />);
    fireEvent.click(screen.getByTestId('datepicker-trigger'));

    fireEvent.click(screen.getByTestId('datepicker-year-label'));
    expect(screen.getByTestId('datepicker-years-grid')).toBeInTheDocument();
    expect(screen.queryByTestId('datepicker-days-grid')).not.toBeInTheDocument();
  });

  it('selecting month from month picker returns to days view', () => {
    const jan15 = new Date(2026, 0, 15);
    render(<DatePicker defaultValue={jan15} />);
    fireEvent.click(screen.getByTestId('datepicker-trigger'));

    fireEvent.click(screen.getByTestId('datepicker-month-label'));
    // Click "March"
    const marchBtn = screen.getByRole('button', { name: 'March' });
    fireEvent.click(marchBtn);

    expect(screen.getByTestId('datepicker-days-grid')).toBeInTheDocument();
    expect(screen.getByTestId('datepicker-month-label')).toHaveTextContent('March');
  });

  it('selecting year from year picker returns to days view', () => {
    const jan15 = new Date(2026, 0, 15);
    render(<DatePicker defaultValue={jan15} />);
    fireEvent.click(screen.getByTestId('datepicker-trigger'));

    fireEvent.click(screen.getByTestId('datepicker-year-label'));
    // Click "2025"
    const yearBtn = screen.getByRole('button', { name: '2025' });
    fireEvent.click(yearBtn);

    expect(screen.getByTestId('datepicker-days-grid')).toBeInTheDocument();
    expect(screen.getByTestId('datepicker-year-label')).toHaveTextContent('2025');
  });

  it('closes panel after selecting a date', () => {
    const jan15 = new Date(2026, 0, 15);
    render(<DatePicker defaultValue={jan15} />);
    fireEvent.click(screen.getByTestId('datepicker-trigger'));
    expect(screen.getByTestId('datepicker-panel')).toBeInTheDocument();

    const day20 = screen.getByRole('gridcell', { name: /January 20, 2026/ });
    fireEvent.click(day20);

    expect(screen.queryByTestId('datepicker-panel')).not.toBeInTheDocument();
  });

  it('wraps months correctly when navigating past December', () => {
    const dec = new Date(2026, 11, 5); // December 2026
    render(<DatePicker defaultValue={dec} />);
    fireEvent.click(screen.getByTestId('datepicker-trigger'));

    expect(screen.getByTestId('datepicker-month-label')).toHaveTextContent('December');
    expect(screen.getByTestId('datepicker-year-label')).toHaveTextContent('2026');

    fireEvent.click(screen.getByTestId('datepicker-next-month'));
    expect(screen.getByTestId('datepicker-month-label')).toHaveTextContent('January');
    expect(screen.getByTestId('datepicker-year-label')).toHaveTextContent('2027');
  });

  it('wraps months correctly when navigating before January', () => {
    const jan = new Date(2026, 0, 5); // January 2026
    render(<DatePicker defaultValue={jan} />);
    fireEvent.click(screen.getByTestId('datepicker-trigger'));

    fireEvent.click(screen.getByTestId('datepicker-prev-month'));
    expect(screen.getByTestId('datepicker-month-label')).toHaveTextContent('December');
    expect(screen.getByTestId('datepicker-year-label')).toHaveTextContent('2025');
  });
});
