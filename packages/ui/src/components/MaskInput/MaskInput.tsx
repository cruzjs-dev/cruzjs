import React, { forwardRef, useCallback, useRef, useState } from 'react';

export type MaskInputSize = 'sm' | 'md' | 'lg';

export type MaskInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> & {
  label?: React.ReactNode;
  description?: string;
  error?: string;
  /** Mask pattern: 9 = digit, a = letter, * = any alphanumeric */
  mask: string;
  value?: string;
  defaultValue?: string;
  /** Callback with formatted value and raw value (digits/letters only) */
  onChange?: (value: string, rawValue: string) => void;
  size?: MaskInputSize;
  disabled?: boolean;
};

const sizeStyles: Record<MaskInputSize, { input: string; label: string }> = {
  sm: { input: 'h-8 px-3 text-xs rounded-lg', label: 'text-xs' },
  md: { input: 'h-10 px-3.5 text-sm rounded-xl', label: 'text-sm' },
  lg: { input: 'h-12 px-4 text-base rounded-xl', label: 'text-sm' },
};

function isMaskChar(c: string): boolean {
  return c === '9' || c === 'a' || c === '*';
}

function matchesMaskChar(maskChar: string, inputChar: string): boolean {
  if (maskChar === '9') {
    return /\d/.test(inputChar);
  }
  if (maskChar === 'a') {
    return /[a-zA-Z]/.test(inputChar);
  }
  if (maskChar === '*') {
    return /[a-zA-Z0-9]/.test(inputChar);
  }
  return false;
}

function extractRawValue(formatted: string, mask: string): string {
  let raw = '';
  for (let i = 0; i < formatted.length && i < mask.length; i++) {
    if (isMaskChar(mask[i]) && formatted[i] && formatted[i] !== '_') {
      raw += formatted[i];
    }
  }
  return raw;
}

function formatWithMask(raw: string, mask: string): string {
  let result = '';
  let rawIdx = 0;

  for (let i = 0; i < mask.length; i++) {
    if (rawIdx >= raw.length) {
      break;
    }

    if (isMaskChar(mask[i])) {
      // Skip raw chars that don't match
      while (rawIdx < raw.length && !matchesMaskChar(mask[i], raw[rawIdx])) {
        rawIdx++;
      }
      if (rawIdx < raw.length) {
        result += raw[rawIdx];
        rawIdx++;
      }
    } else {
      result += mask[i];
    }
  }

  return result;
}

function getNextCursorPosition(formatted: string, mask: string): number {
  // Find position right after the last filled mask slot
  let lastFilledPos = -1;
  for (let i = 0; i < formatted.length && i < mask.length; i++) {
    if (isMaskChar(mask[i])) {
      lastFilledPos = i;
    }
  }
  return lastFilledPos + 1;
}

export const MaskInput = forwardRef<HTMLInputElement, MaskInputProps>(function MaskInput(
  {
    label,
    description,
    error,
    mask,
    value: controlledValue,
    defaultValue,
    onChange,
    size = 'md',
    disabled,
    className,
    id,
    ...rest
  },
  ref,
) {
  const s = sizeStyles[size];
  const inputId = id || (label ? `maskinput-${Math.random().toString(36).slice(2, 9)}` : undefined);
  const hasError = !!error;

  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(() => {
    if (defaultValue !== undefined) {
      return formatWithMask(defaultValue, mask);
    }
    return '';
  });

  const displayValue = isControlled ? controlledValue : internalValue;
  const internalRef = useRef<HTMLInputElement | null>(null);

  const setRefs = useCallback(
    (node: HTMLInputElement | null) => {
      internalRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
      }
    },
    [ref],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      // Extract only valid characters from input
      const rawChars = inputValue.replace(/[^a-zA-Z0-9]/g, '');
      const formatted = formatWithMask(rawChars, mask);
      const raw = extractRawValue(formatted, mask);

      if (!isControlled) {
        setInternalValue(formatted);
      }

      onChange?.(formatted, raw);

      // Set cursor position after React re-renders
      requestAnimationFrame(() => {
        const el = internalRef.current;
        if (el) {
          const cursorPos = getNextCursorPosition(formatted, mask);
          el.setSelectionRange(cursorPos, cursorPos);
        }
      });
    },
    [mask, onChange, isControlled],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        const el = internalRef.current;
        if (!el) {
          return;
        }

        const currentVal = isControlled ? (controlledValue ?? '') : internalValue;
        const raw = extractRawValue(currentVal, mask);

        if (raw.length === 0) {
          return;
        }

        // Remove the last raw character
        const newRaw = raw.slice(0, -1);
        const formatted = formatWithMask(newRaw, mask);

        if (!isControlled) {
          setInternalValue(formatted);
        }

        onChange?.(formatted, newRaw);

        requestAnimationFrame(() => {
          const cursorPos = getNextCursorPosition(formatted, mask);
          el.setSelectionRange(cursorPos, cursorPos);
        });
      }
    },
    [mask, onChange, isControlled, controlledValue, internalValue],
  );

  return (
    <div className={['w-full', className].filter(Boolean).join(' ')}>
      {label && (
        <label
          htmlFor={inputId}
          className={['block font-medium text-text-secondary mb-1.5', s.label].join(' ')}
        >
          {label}
        </label>
      )}
      {description && (
        <p className="text-xs text-text-tertiary mb-1.5">{description}</p>
      )}
      <input
        ref={setRefs}
        id={inputId}
        type="text"
        disabled={disabled}
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={mask.replace(/9/g, '_').replace(/a/g, '_').replace(/\*/g, '_')}
        className={[
          'w-full border bg-surface text-text outline-none transition-all duration-200',
          s.input,
          hasError
            ? 'border-danger focus:ring-2 focus:ring-danger/30 focus:border-danger'
            : 'border-input-border focus:ring-2 focus:ring-primary/50 focus:border-primary',
          disabled ? 'opacity-50 cursor-not-allowed bg-surface-lighter' : '',
          'placeholder:text-text-muted',
        ].filter(Boolean).join(' ')}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? `${inputId}-error` : undefined}
        data-testid="mask-input"
        {...rest}
      />
      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs text-danger">{error}</p>
      )}
    </div>
  );
});

MaskInput.displayName = 'MaskInput';
