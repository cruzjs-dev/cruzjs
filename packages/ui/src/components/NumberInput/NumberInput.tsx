import React, { forwardRef, useCallback, useRef, useState } from 'react';

export type NumberInputSize = 'sm' | 'md' | 'lg';

export type NumberInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type' | 'onChange'> & {
  label?: React.ReactNode;
  description?: string;
  error?: string;
  size?: NumberInputSize;
  value?: number;
  defaultValue?: number;
  onChange?: (value: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  showControls?: boolean;
};

const sizeStyles: Record<NumberInputSize, { input: string; label: string; btn: string }> = {
  sm: { input: 'h-8 text-xs rounded-md', label: 'text-xs', btn: 'w-7 text-xs' },
  md: { input: 'h-10 text-sm rounded-lg', label: 'text-sm', btn: 'w-9 text-sm' },
  lg: { input: 'h-12 text-base rounded-lg', label: 'text-sm', btn: 'w-11 text-base' },
};

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  {
    label,
    description,
    error,
    size = 'md',
    value: controlledValue,
    defaultValue,
    onChange: onChangeProp,
    min,
    max,
    step = 1,
    precision,
    showControls = true,
    disabled,
    className,
    id,
    ...rest
  },
  ref,
) {
  const [internalValue, setInternalValue] = useState<number | undefined>(defaultValue);
  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? controlledValue : internalValue;
  const inputRef = useRef<HTMLInputElement>(null);

  const s = sizeStyles[size];
  const inputId = id || (label ? `number-${Math.random().toString(36).slice(2, 9)}` : undefined);
  const hasError = !!error;

  const clamp = useCallback(
    (v: number) => {
      let result = v;
      if (min !== undefined) result = Math.max(min, result);
      if (max !== undefined) result = Math.min(max, result);
      if (precision !== undefined) result = parseFloat(result.toFixed(precision));
      return result;
    },
    [min, max, precision],
  );

  const setValue = useCallback(
    (v: number | undefined) => {
      const clamped = v !== undefined ? clamp(v) : undefined;
      if (!isControlled) setInternalValue(clamped);
      onChangeProp?.(clamped);
    },
    [clamp, isControlled, onChangeProp],
  );

  const increment = () => {
    if (disabled) return;
    setValue((currentValue ?? 0) + step);
  };

  const decrement = () => {
    if (disabled) return;
    setValue((currentValue ?? 0) - step);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '' || raw === '-') {
      setValue(undefined);
      return;
    }
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      setValue(parsed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      increment();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      decrement();
    }
  };

  const displayValue = currentValue !== undefined
    ? (precision !== undefined ? currentValue.toFixed(precision) : String(currentValue))
    : '';

  const mergedRef = (node: HTMLInputElement | null) => {
    (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
  };

  return (
    <div className={['w-full', className].filter(Boolean).join(' ')}>
      {label && (
        <label htmlFor={inputId} className={['block font-medium text-text-secondary mb-1.5', s.label].join(' ')}>
          {label}
        </label>
      )}
      {description && <p className="text-xs text-text-tertiary mb-1.5">{description}</p>}
      <div className="relative flex">
        {showControls && (
          <button
            type="button"
            tabIndex={-1}
            onClick={decrement}
            disabled={disabled || (min !== undefined && (currentValue ?? 0) <= min)}
            aria-label="Decrease"
            className={[
              s.btn,
              'flex items-center justify-center border border-r-0 border-input-border bg-surface-lighter',
              'text-text-secondary hover:bg-surface-border hover:text-text-strong',
              'transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
              size === 'sm' ? 'rounded-l-md' : 'rounded-l-lg',
            ].join(' ')}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
            </svg>
          </button>
        )}
        <input
          ref={mergedRef}
          id={inputId}
          type="text"
          inputMode="decimal"
          role="spinbutton"
          aria-valuenow={currentValue}
          aria-valuemin={min}
          aria-valuemax={max}
          value={displayValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={[
            'flex-1 border bg-surface text-text text-center outline-none transition-all duration-200 tabular-nums',
            s.input,
            showControls ? 'rounded-none' : '',
            hasError
              ? 'border-danger focus:ring-2 focus:ring-danger/30 focus:border-danger'
              : 'border-input-border focus:ring-2 focus:ring-primary/50 focus:border-primary',
            disabled ? 'opacity-50 cursor-not-allowed bg-surface-lighter' : '',
            'placeholder:text-text-muted',
          ].filter(Boolean).join(' ')}
          aria-invalid={hasError || undefined}
          {...rest}
        />
        {showControls && (
          <button
            type="button"
            tabIndex={-1}
            onClick={increment}
            disabled={disabled || (max !== undefined && (currentValue ?? 0) >= max)}
            aria-label="Increase"
            className={[
              s.btn,
              'flex items-center justify-center border border-l-0 border-input-border bg-surface-lighter',
              'text-text-secondary hover:bg-surface-border hover:text-text-strong',
              'transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
              size === 'sm' ? 'rounded-r-md' : 'rounded-r-lg',
            ].join(' ')}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      )}
    </div>
  );
});

NumberInput.displayName = 'NumberInput';
