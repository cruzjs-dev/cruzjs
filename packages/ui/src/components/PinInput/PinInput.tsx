import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PinInputSize = 'sm' | 'md' | 'lg';
export type PinInputType = 'alphanumeric' | 'number';

export type PinInputProps = {
  label?: React.ReactNode;
  description?: string;
  error?: string;
  size?: PinInputSize;
  length?: number;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  mask?: boolean;
  type?: PinInputType;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
};

// ─── Size Tokens ──────────────────────────────────────────────────────────────

const cellSizeStyles: Record<PinInputSize, { cell: string; text: string; label: string }> = {
  sm: {
    cell: 'w-[44px] h-[44px] rounded-lg',
    text: 'text-lg',
    label: 'text-xs',
  },
  md: {
    cell: 'w-[48px] h-[48px] rounded-xl',
    text: 'text-xl',
    label: 'text-sm',
  },
  lg: {
    cell: 'w-[52px] h-[52px] rounded-xl',
    text: 'text-2xl',
    label: 'text-sm',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidChar(char: string, type: PinInputType): boolean {
  if (type === 'number') {
    return /^\d$/.test(char);
  }
  return /^[a-zA-Z0-9]$/.test(char);
}

function filterValue(raw: string, type: PinInputType): string {
  return raw
    .split('')
    .filter((ch) => isValidChar(ch, type))
    .join('');
}

/** Convert a compact value string into a fixed-length array of single chars (empty string for unfilled). */
function valueToCells(value: string, length: number): string[] {
  const result: string[] = new Array(length).fill('');
  for (let i = 0; i < Math.min(value.length, length); i++) {
    result[i] = value[i];
  }
  return result;
}

/** Convert a cell array back to a compact value string (no trailing empties). */
function cellsToValue(cells: string[]): string {
  let lastIndex = -1;
  for (let i = cells.length - 1; i >= 0; i--) {
    if (cells[i] !== '') {
      lastIndex = i;
      break;
    }
  }
  if (lastIndex === -1) {
    return '';
  }
  return cells
    .slice(0, lastIndex + 1)
    .map((c) => c || '')
    .join('');
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PinInput = forwardRef<HTMLInputElement, PinInputProps>(function PinInput(
  {
    label,
    description,
    error,
    size = 'md',
    length = 6,
    value: controlledValue,
    defaultValue = '',
    onChange,
    onComplete,
    mask = false,
    type = 'number',
    disabled = false,
    placeholder = '○',
    autoFocus = false,
    className,
  },
  forwardedRef,
) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const currentValue = isControlled ? controlledValue : internalValue;

  const cellRefs = useRef<(HTMLInputElement | null)[]>([]);
  const onCompleteRef = useRef(onComplete);
  const pendingFocusRef = useRef<number | null>(null);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Apply pending focus after render so jsdom (and real browsers) pick up focus
  // after React has finished updating DOM values.
  useEffect(() => {
    if (pendingFocusRef.current !== null) {
      const idx = pendingFocusRef.current;
      pendingFocusRef.current = null;
      cellRefs.current[idx]?.focus();
    }
  });

  // Expose the first cell via forwardRef
  const setFirstCellRef = useCallback(
    (node: HTMLInputElement | null) => {
      cellRefs.current[0] = node;
      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
      }
    },
    [forwardedRef],
  );

  // Auto-focus first cell on mount
  useEffect(() => {
    if (autoFocus && cellRefs.current[0]) {
      cellRefs.current[0].focus();
    }
  }, [autoFocus]);

  // Derive cell values from current compact value
  const cells = valueToCells(currentValue, length);

  const updateValue = useCallback(
    (newCells: string[]) => {
      const compact = cellsToValue(newCells);
      if (!isControlled) {
        setInternalValue(compact);
      }
      onChange?.(compact);

      // Check if all cells are filled
      const allFilled = newCells.every((c) => c !== '');
      if (allFilled && newCells.length === length) {
        const fullValue = newCells.join('');
        setTimeout(() => {
          onCompleteRef.current?.(fullValue);
        }, 0);
      }
    },
    [isControlled, length, onChange],
  );

  /** Focus a cell immediately (for actions that don't change state). */
  const focusCell = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, length - 1));
      cellRefs.current[clamped]?.focus();
    },
    [length],
  );

  /** Schedule focus for after the next render (for actions that change state). */
  const scheduleFocus = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, length - 1));
      pendingFocusRef.current = clamped;
    },
    [length],
  );

  const handleInput = useCallback(
    (index: number, inputValue: string) => {
      const filtered = filterValue(inputValue, type);
      if (filtered.length === 0) {
        return;
      }

      if (filtered.length === 1) {
        const newCells = [...cells];
        newCells[index] = filtered;
        updateValue(newCells);
        if (index < length - 1) {
          scheduleFocus(index + 1);
        } else {
          scheduleFocus(index);
        }
      } else {
        const newCells = [...cells];
        for (let i = 0; i < filtered.length && index + i < length; i++) {
          newCells[index + i] = filtered[i];
        }
        updateValue(newCells);
        const nextIndex = Math.min(index + filtered.length, length - 1);
        scheduleFocus(nextIndex);
      }
    },
    [cells, type, length, updateValue, scheduleFocus],
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        const newCells = [...cells];
        if (cells[index] !== '') {
          newCells[index] = '';
          updateValue(newCells);
          scheduleFocus(index);
        } else if (index > 0) {
          newCells[index - 1] = '';
          updateValue(newCells);
          scheduleFocus(index - 1);
        }
        return;
      }

      if (e.key === 'Delete') {
        e.preventDefault();
        const newCells = [...cells];
        newCells[index] = '';
        updateValue(newCells);
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (index > 0) {
          focusCell(index - 1);
        }
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (index < length - 1) {
          focusCell(index + 1);
        }
        return;
      }

      // Single printable character
      if (e.key.length === 1 && isValidChar(e.key, type)) {
        e.preventDefault();
        handleInput(index, e.key);
        return;
      }
    },
    [cells, type, length, updateValue, focusCell, scheduleFocus, handleInput],
  );

  const handlePaste = useCallback(
    (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text/plain');
      const filtered = filterValue(pasted, type);
      if (filtered.length === 0) {
        return;
      }

      const newCells = [...cells];
      for (let i = 0; i < filtered.length && index + i < length; i++) {
        newCells[index + i] = filtered[i];
      }
      updateValue(newCells);
      const nextIndex = Math.min(index + filtered.length, length - 1);
      scheduleFocus(nextIndex);
    },
    [cells, type, length, updateValue, scheduleFocus],
  );

  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  }, []);

  const s = cellSizeStyles[size];
  const hasError = !!error;
  const generatedId = React.useId();
  const groupId = `pin-input-${generatedId}`;
  const errorId = hasError ? `${groupId}-error` : undefined;
  const descriptionId = description ? `${groupId}-description` : undefined;

  return (
    <div className={['w-fit', className].filter(Boolean).join(' ')}>
      {label && (
        <label
          htmlFor={`${groupId}-cell-0`}
          className={['block font-medium text-text-secondary mb-1.5', s.label].join(' ')}
        >
          {label}
        </label>
      )}
      {description && (
        <p id={descriptionId} className="text-xs text-text-tertiary mb-1.5">
          {description}
        </p>
      )}
      <div
        role="group"
        aria-label={typeof label === 'string' ? label : 'PIN input'}
        aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
        className="flex items-center gap-2"
      >
        {Array.from({ length }, (_, index) => {
          const cellValue = cells[index];
          const isFilled = cellValue !== '';

          return (
            <input
              key={index}
              ref={index === 0 ? setFirstCellRef : (el) => { cellRefs.current[index] = el; }}
              id={`${groupId}-cell-${index}`}
              type={mask ? 'password' : 'text'}
              inputMode={type === 'number' ? 'numeric' : 'text'}
              pattern={type === 'number' ? '[0-9]*' : undefined}
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              maxLength={1}
              value={cellValue}
              placeholder={placeholder}
              disabled={disabled}
              aria-label={`PIN digit ${index + 1} of ${length}`}
              aria-invalid={hasError || undefined}
              className={[
                // Base
                'text-center font-semibold outline-none transition-all duration-200',
                'border bg-surface text-text select-all',
                s.cell,
                s.text,
                // Placeholder
                'placeholder:text-text-muted placeholder:font-normal',
                // Filled state: tonal background
                isFilled
                  ? 'bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-surface))]'
                  : '',
                // Focus state: ring + scale bump + glass highlight (spring easing via inline style)
                'focus:ring-1 focus:ring-primary/40 focus:scale-105',
                'focus:shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]',
                // Error state
                hasError
                  ? 'border-danger focus:ring-danger/30 focus:border-danger'
                  : 'border-input-border focus:border-primary',
                // Disabled
                disabled ? 'opacity-50 cursor-not-allowed bg-surface-lighter' : 'cursor-text',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{
                transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                caretColor: 'transparent',
              }}
              onChange={(e) => {
                // Fallback for IME / mobile browsers that don't fire keyDown
                const val = e.target.value;
                if (val.length > 0) {
                  handleInput(index, val);
                }
              }}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={(e) => handlePaste(index, e)}
              onFocus={handleFocus}
            />
          );
        })}
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

PinInput.displayName = 'PinInput';
