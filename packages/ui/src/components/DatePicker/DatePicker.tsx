import React, { forwardRef, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

export type DatePickerSize = 'sm' | 'md' | 'lg';

export type DatePickerProps = {
  label?: React.ReactNode;
  description?: string;
  error?: string;
  value?: Date | null;
  defaultValue?: Date | null;
  onChange?: (date: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
  size?: DatePickerSize;
  disabled?: boolean;
  clearable?: boolean;
  locale?: string;
  firstDayOfWeek?: 0 | 1;
  className?: string;
};

// --- Size styles ---

const sizeStyles: Record<DatePickerSize, { trigger: string; label: string; icon: string }> = {
  sm: { trigger: 'h-8 px-3 text-xs rounded-lg', label: 'text-xs', icon: 'w-3.5 h-3.5' },
  md: { trigger: 'h-10 px-3.5 text-sm rounded-xl', label: 'text-sm', icon: 'w-4 h-4' },
  lg: { trigger: 'h-12 px-4 text-base rounded-xl', label: 'text-sm', icon: 'w-5 h-5' },
};

// --- Calendar icon SVG ---

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4H16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2h1.25V2.75A.75.75 0 015.75 2zM4 7.5h12V6H4v1.5zm0 1.5v7h12V9H4z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ClearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
    </svg>
  );
}

// --- Date utility helpers ---

type CalendarView = 'days' | 'months' | 'years';

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

function isDateDisabled(date: Date, minDate?: Date, maxDate?: Date): boolean {
  if (minDate) {
    const min = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
    if (date < min) {
      return true;
    }
  }
  if (maxDate) {
    const max = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
    if (date > max) {
      return true;
    }
  }
  return false;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getCalendarDays(year: number, month: number, firstDayOfWeek: 0 | 1): Date[] {
  const firstOfMonth = new Date(year, month, 1);
  const dayOfWeek = firstOfMonth.getDay();
  const offset = (dayOfWeek - firstDayOfWeek + 7) % 7;

  const days: Date[] = [];
  // Leading days from previous month
  const prevMonthDays = getDaysInMonth(year, month - 1);
  for (let i = offset - 1; i >= 0; i--) {
    days.push(new Date(year, month - 1, prevMonthDays - i));
  }
  // Current month days
  const daysInMonth = getDaysInMonth(year, month);
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, month, d));
  }
  // Trailing days to fill 6 rows
  const totalCells = 42; // 6 rows x 7 columns
  while (days.length < totalCells) {
    const nextDay = days.length - offset - daysInMonth + 1;
    days.push(new Date(year, month + 1, nextDay));
  }

  return days;
}

function getDayNames(locale: string, firstDayOfWeek: 0 | 1): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const names: string[] = [];
  // Jan 4, 2026 is a Sunday
  for (let i = 0; i < 7; i++) {
    const day = new Date(2026, 0, 4 + ((i + firstDayOfWeek) % 7));
    names.push(formatter.format(day));
  }
  return names;
}

function getMonthNames(locale: string): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { month: 'long' });
  const names: string[] = [];
  for (let m = 0; m < 12; m++) {
    names.push(formatter.format(new Date(2026, m, 1)));
  }
  return names;
}

function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function getMonthLabel(year: number, month: number, locale: string): string {
  const formatter = new Intl.DateTimeFormat(locale, { month: 'long' });
  return formatter.format(new Date(year, month, 1));
}

// --- Sub-components ---

type CalendarHeaderProps = {
  viewYear: number;
  viewMonth: number;
  locale: string;
  view: CalendarView;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onClickMonth: () => void;
  onClickYear: () => void;
};

function CalendarHeader({
  viewYear,
  viewMonth,
  locale,
  view,
  onPrevMonth,
  onNextMonth,
  onClickMonth,
  onClickYear,
}: CalendarHeaderProps) {
  const monthLabel = getMonthLabel(viewYear, viewMonth, locale);

  return (
    <div className="flex items-center justify-between mb-2" data-testid="datepicker-header">
      <button
        type="button"
        onClick={onPrevMonth}
        className={[
          'w-8 h-8 flex items-center justify-center rounded-lg',
          'text-text-secondary hover:bg-surface-lighter hover:text-text',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          view !== 'days' ? 'invisible' : '',
        ].filter(Boolean).join(' ')}
        aria-label="Previous month"
        data-testid="datepicker-prev-month"
        tabIndex={view !== 'days' ? -1 : 0}
      >
        <ChevronLeftIcon className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onClickMonth}
          className={[
            'px-2 py-1 text-sm font-semibold rounded-lg',
            'text-text hover:bg-surface-lighter',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
            view === 'months' ? 'bg-surface-lighter' : '',
          ].filter(Boolean).join(' ')}
          data-testid="datepicker-month-label"
        >
          {monthLabel}
        </button>
        <button
          type="button"
          onClick={onClickYear}
          className={[
            'px-2 py-1 text-sm font-semibold rounded-lg',
            'text-text hover:bg-surface-lighter',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
            view === 'years' ? 'bg-surface-lighter' : '',
          ].filter(Boolean).join(' ')}
          data-testid="datepicker-year-label"
        >
          {viewYear}
        </button>
      </div>

      <button
        type="button"
        onClick={onNextMonth}
        className={[
          'w-8 h-8 flex items-center justify-center rounded-lg',
          'text-text-secondary hover:bg-surface-lighter hover:text-text',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          view !== 'days' ? 'invisible' : '',
        ].filter(Boolean).join(' ')}
        aria-label="Next month"
        data-testid="datepicker-next-month"
        tabIndex={view !== 'days' ? -1 : 0}
      >
        <ChevronRightIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

type DaysGridProps = {
  days: Date[];
  dayNames: string[];
  viewMonth: number;
  selected: Date | null;
  focusedDate: Date;
  minDate?: Date;
  maxDate?: Date;
  onSelectDate: (date: Date) => void;
  onFocusDate: (date: Date) => void;
};

function DaysGrid({
  days,
  dayNames,
  viewMonth,
  selected,
  focusedDate,
  minDate,
  maxDate,
  onSelectDate,
  onFocusDate,
}: DaysGridProps) {
  return (
    <div data-testid="datepicker-days-grid">
      {/* Day name headers */}
      <div className="grid grid-cols-7 mb-1">
        {dayNames.map((name) => (
          <div
            key={name}
            className="h-8 flex items-center justify-center text-xs font-medium text-text-tertiary select-none"
          >
            {name}
          </div>
        ))}
      </div>
      {/* Day cells */}
      <div className="grid grid-cols-7" role="grid" data-testid="datepicker-grid">
        {days.map((day, idx) => {
          const isCurrentMonth = day.getMonth() === viewMonth;
          const isDisabled = isDateDisabled(day, minDate, maxDate);
          const isSelected = selected ? isSameDay(day, selected) : false;
          const isTodayDate = isToday(day);
          const isFocused = isSameDay(day, focusedDate);

          return (
            <button
              key={idx}
              type="button"
              role="gridcell"
              tabIndex={isFocused ? 0 : -1}
              disabled={isDisabled}
              onClick={() => {
                if (!isDisabled) {
                  onSelectDate(day);
                }
              }}
              onFocus={() => onFocusDate(day)}
              aria-label={day.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              aria-selected={isSelected}
              aria-disabled={isDisabled}
              data-today={isTodayDate || undefined}
              data-selected={isSelected || undefined}
              data-outside-month={!isCurrentMonth || undefined}
              className={[
                'relative h-9 w-9 mx-auto flex items-center justify-center rounded-lg text-sm',
                'transition-all duration-150 select-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                isDisabled
                  ? 'text-text-muted/40 cursor-not-allowed'
                  : isSelected
                    ? 'bg-primary text-on-primary font-semibold shadow-sm'
                    : !isCurrentMonth
                      ? 'text-text-muted/50 hover:bg-surface-lighter hover:text-text-secondary'
                      : 'text-text hover:bg-surface-lighter',
                isTodayDate && !isSelected ? 'ring-1 ring-primary/20 font-medium' : '',
              ].filter(Boolean).join(' ')}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type MonthsGridProps = {
  viewYear: number;
  locale: string;
  currentMonth: number;
  onSelectMonth: (month: number) => void;
};

function MonthsGrid({ viewYear, locale, currentMonth, onSelectMonth }: MonthsGridProps) {
  const monthNames = getMonthNames(locale);
  const now = new Date();
  const isCurrentYear = viewYear === now.getFullYear();

  return (
    <div className="grid grid-cols-3 gap-2" data-testid="datepicker-months-grid">
      {monthNames.map((name, idx) => {
        const isSelected = idx === currentMonth;
        const isThisMonth = isCurrentYear && idx === now.getMonth();

        return (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectMonth(idx)}
            className={[
              'h-10 rounded-lg text-sm transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              isSelected
                ? 'bg-primary text-on-primary font-semibold shadow-sm'
                : 'text-text hover:bg-surface-lighter',
              isThisMonth && !isSelected ? 'ring-1 ring-primary/20 font-medium' : '',
            ].filter(Boolean).join(' ')}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}

type YearsGridProps = {
  viewYear: number;
  onSelectYear: (year: number) => void;
};

function YearsGrid({ viewYear, onSelectYear }: YearsGridProps) {
  const startYear = viewYear - (viewYear % 12);
  const years = Array.from({ length: 12 }, (_, i) => startYear + i);
  const currentYear = new Date().getFullYear();

  return (
    <div className="grid grid-cols-3 gap-2" data-testid="datepicker-years-grid">
      {years.map((year) => {
        const isSelected = year === viewYear;
        const isThisYear = year === currentYear;

        return (
          <button
            key={year}
            type="button"
            onClick={() => onSelectYear(year)}
            className={[
              'h-10 rounded-lg text-sm transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              isSelected
                ? 'bg-primary text-on-primary font-semibold shadow-sm'
                : 'text-text hover:bg-surface-lighter',
              isThisYear && !isSelected ? 'ring-1 ring-primary/20 font-medium' : '',
            ].filter(Boolean).join(' ')}
          >
            {year}
          </button>
        );
      })}
    </div>
  );
}

// --- Main component ---

export const DatePicker = forwardRef<HTMLDivElement, DatePickerProps>(function DatePicker(
  {
    label,
    description,
    error,
    value: controlledValue,
    defaultValue,
    onChange,
    minDate,
    maxDate,
    placeholder = 'Select a date...',
    size = 'md',
    disabled = false,
    clearable = false,
    locale = 'en-US',
    firstDayOfWeek = 0,
    className,
  },
  ref,
) {
  const isMobile = useIsMobile();
  const uid = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledValue !== undefined;
  const initialDate = (isControlled ? controlledValue : defaultValue) ?? null;

  const [internalDate, setInternalDate] = useState<Date | null>(initialDate);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<CalendarView>('days');
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const currentDate = isControlled ? (controlledValue ?? null) : internalDate;

  // Calendar view state
  const [viewYear, setViewYear] = useState(() => (currentDate ?? new Date()).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => (currentDate ?? new Date()).getMonth());
  const [focusedDate, setFocusedDate] = useState(() => currentDate ?? new Date());

  // Sync view when opening or when controlled value changes
  useEffect(() => {
    if (open) {
      const d = currentDate ?? new Date();
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setFocusedDate(currentDate ?? new Date());
      setView('days');
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync focused date when controlled value changes
  useEffect(() => {
    if (isControlled && controlledValue) {
      setFocusedDate(controlledValue);
    }
  }, [isControlled, controlledValue]);

  const dayNames = useMemo(() => getDayNames(locale, firstDayOfWeek), [locale, firstDayOfWeek]);
  const calendarDays = useMemo(() => getCalendarDays(viewYear, viewMonth, firstDayOfWeek), [viewYear, viewMonth, firstDayOfWeek]);

  const handleSelectDate = useCallback(
    (date: Date) => {
      if (!isControlled) {
        setInternalDate(date);
      }
      onChange?.(date);
      setOpen(false);
    },
    [isControlled, onChange],
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isControlled) {
        setInternalDate(null);
      }
      onChange?.(null);
    },
    [isControlled, onChange],
  );

  const handlePrevMonth = useCallback(() => {
    setViewMonth((prev) => {
      if (prev === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setViewMonth((prev) => {
      if (prev === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  }, []);

  const handleClickMonth = useCallback(() => {
    setView((prev) => (prev === 'months' ? 'days' : 'months'));
  }, []);

  const handleClickYear = useCallback(() => {
    setView((prev) => (prev === 'years' ? 'days' : 'years'));
  }, []);

  const handleSelectMonth = useCallback((month: number) => {
    setViewMonth(month);
    setView('days');
  }, []);

  const handleSelectYear = useCallback((year: number) => {
    setViewYear(year);
    setView('days');
  }, []);

  const handleFocusDate = useCallback((date: Date) => {
    setFocusedDate(date);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (view !== 'days') {
        return;
      }

      let nextDate: Date | undefined;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          nextDate = new Date(focusedDate);
          nextDate.setDate(nextDate.getDate() - 1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          nextDate = new Date(focusedDate);
          nextDate.setDate(nextDate.getDate() + 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          nextDate = new Date(focusedDate);
          nextDate.setDate(nextDate.getDate() - 7);
          break;
        case 'ArrowDown':
          e.preventDefault();
          nextDate = new Date(focusedDate);
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'Enter':
          e.preventDefault();
          if (!isDateDisabled(focusedDate, minDate, maxDate)) {
            handleSelectDate(focusedDate);
          }
          return;
        case 'Escape':
          e.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
          return;
      }

      if (nextDate) {
        setFocusedDate(nextDate);
        // Navigate to the new month if needed
        if (nextDate.getMonth() !== viewMonth || nextDate.getFullYear() !== viewYear) {
          setViewMonth(nextDate.getMonth());
          setViewYear(nextDate.getFullYear());
        }
      }
    },
    [view, focusedDate, viewMonth, viewYear, minDate, maxDate, handleSelectDate],
  );

  // Position panel below trigger (desktop)
  const updatePosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    const panelEl = panelRef.current;
    if (!triggerEl || !panelEl) {
      return;
    }

    const triggerRect = triggerEl.getBoundingClientRect();
    const panelRect = panelEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = triggerRect.bottom + 8;
    let left = triggerRect.left;

    // Flip up if not enough space below
    if (top + panelRect.height > vh - 8) {
      top = triggerRect.top - panelRect.height - 8;
    }
    // Clamp horizontally
    left = Math.max(8, Math.min(left, vw - panelRect.width - 8));
    // Clamp vertically
    top = Math.max(8, Math.min(top, vh - panelRect.height - 8));

    setPosition({ top, left });
  }, []);

  useEffect(() => {
    if (!open || isMobile) {
      return;
    }
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, isMobile, updatePosition]);

  // Close on click outside / Escape
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const handleToggle = () => {
    if (disabled) {
      return;
    }
    setOpen((prev) => !prev);
  };

  const s = sizeStyles[size];
  const hasError = !!error;
  const labelId = label ? `${uid}-label` : undefined;
  const displayValue = currentDate ? formatDate(currentDate, locale) : '';

  const panelContent = (
    <div
      className="flex flex-col gap-1"
      data-testid="datepicker-panel"
      onKeyDown={handleKeyDown}
    >
      <CalendarHeader
        viewYear={viewYear}
        viewMonth={viewMonth}
        locale={locale}
        view={view}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onClickMonth={handleClickMonth}
        onClickYear={handleClickYear}
      />

      {view === 'days' && (
        <DaysGrid
          days={calendarDays}
          dayNames={dayNames}
          viewMonth={viewMonth}
          selected={currentDate}
          focusedDate={focusedDate}
          minDate={minDate}
          maxDate={maxDate}
          onSelectDate={handleSelectDate}
          onFocusDate={handleFocusDate}
        />
      )}

      {view === 'months' && (
        <MonthsGrid
          viewYear={viewYear}
          locale={locale}
          currentMonth={viewMonth}
          onSelectMonth={handleSelectMonth}
        />
      )}

      {view === 'years' && (
        <YearsGrid
          viewYear={viewYear}
          onSelectYear={handleSelectYear}
        />
      )}
    </div>
  );

  const triggerContent = (
    <button
      ref={triggerRef}
      type="button"
      disabled={disabled}
      onClick={handleToggle}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-labelledby={labelId}
      data-testid="datepicker-trigger"
      className={[
        'w-full flex items-center gap-2 border bg-surface text-left outline-none transition-all duration-200',
        s.trigger,
        'border-input-border',
        'focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary',
        hasError ? 'ring-2 ring-danger/30 border-danger' : '',
        disabled ? 'opacity-50 cursor-not-allowed bg-surface-lighter' : 'cursor-pointer hover:border-input-border-hover',
      ].filter(Boolean).join(' ')}
    >
      <CalendarIcon className={['shrink-0 text-text-muted', s.icon].join(' ')} />
      <span className={['flex-1 truncate', currentDate ? 'text-text' : 'text-text-muted'].join(' ')}>
        {displayValue || placeholder}
      </span>
      {clearable && currentDate && !disabled && (
        <span
          role="button"
          tabIndex={-1}
          onClick={handleClear}
          className="shrink-0 text-text-muted hover:text-text transition-colors duration-150"
          aria-label="Clear date"
          data-testid="datepicker-clear"
        >
          <ClearIcon className={s.icon} />
        </span>
      )}
    </button>
  );

  if (isMobile) {
    return (
      <div ref={ref} className={['w-full', className].filter(Boolean).join(' ')}>
        {label && (
          <label id={labelId} className={['block font-medium text-text-secondary mb-1.5', s.label].join(' ')}>
            {label}
          </label>
        )}
        {description && (
          <p className="text-xs text-text-tertiary mb-1.5">{description}</p>
        )}

        {triggerContent}

        {error && (
          <p className="mt-1.5 text-xs text-danger" data-testid="datepicker-error">{error}</p>
        )}

        {open && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/30"
              onClick={() => setOpen(false)}
              aria-hidden="true"
              style={{ animation: 'datepicker-backdrop-in 150ms ease-out both' }}
            />
            <div
              ref={panelRef}
              role="dialog"
              aria-label="Date picker"
              className={[
                'fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-surface p-5',
                'shadow-[0_-8px_40px_-8px_rgba(0,0,0,0.2)]',
                'max-h-[80vh] overflow-y-auto',
              ].join(' ')}
              style={{
                animation: 'datepicker-sheet-in 250ms cubic-bezier(0.16, 1, 0.3, 1) both',
                paddingBottom: 'env(safe-area-inset-bottom, 20px)',
              }}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-surface-border" aria-hidden="true" />
              {panelContent}
            </div>
          </>
        )}
        <style>{datepickerKeyframes}</style>
      </div>
    );
  }

  return (
    <div ref={ref} className={['w-full', className].filter(Boolean).join(' ')}>
      {label && (
        <label id={labelId} className={['block font-medium text-text-secondary mb-1.5', s.label].join(' ')}>
          {label}
        </label>
      )}
      {description && (
        <p className="text-xs text-text-tertiary mb-1.5">{description}</p>
      )}

      {triggerContent}

      {error && (
        <p className="mt-1.5 text-xs text-danger" data-testid="datepicker-error">{error}</p>
      )}

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Date picker"
          className={[
            'fixed z-50 rounded-2xl bg-surface p-4 w-[304px]',
            'shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.05)]',
            'ring-1 ring-surface-border/50',
          ].join(' ')}
          style={{
            top: position.top,
            left: position.left,
            animation: 'datepicker-panel-in 200ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
          }}
        >
          {panelContent}
        </div>
      )}
      <style>{datepickerKeyframes}</style>
    </div>
  );
});

DatePicker.displayName = 'DatePicker';

const datepickerKeyframes = `
  @keyframes datepicker-panel-in {
    from { opacity: 0; transform: scale(0.95) translateY(-4px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes datepicker-backdrop-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes datepicker-sheet-in {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
`;
