import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type JSONInputSize = 'sm' | 'md' | 'lg';

export type JSONInputProps = {
  label?: React.ReactNode;
  description?: string;
  /** External error message (overrides internal validation error) */
  error?: string;
  value?: string;
  defaultValue?: string;
  /** Callback with current value and whether it parses as valid JSON */
  onChange?: (value: string, valid: boolean) => void;
  /** Auto-format (pretty-print) on blur */
  formatOnBlur?: boolean;
  size?: JSONInputSize;
  disabled?: boolean;
  maxHeight?: string;
  className?: string;
  id?: string;
};

const sizeStyles: Record<JSONInputSize, { textarea: string; label: string; lineNumber: string }> = {
  sm: { textarea: 'text-xs px-3 py-2', label: 'text-xs', lineNumber: 'text-xs px-2 py-2' },
  md: { textarea: 'text-sm px-3.5 py-2.5', label: 'text-sm', lineNumber: 'text-xs px-2.5 py-2.5' },
  lg: { textarea: 'text-base px-4 py-3', label: 'text-sm', lineNumber: 'text-sm px-3 py-3' },
};

function isValidJSON(str: string): boolean {
  if (str.trim() === '') {
    return true;
  }
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

function formatJSON(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}

function countLines(str: string): number {
  if (!str) {
    return 1;
  }
  return str.split('\n').length;
}

export const JSONInput = forwardRef<HTMLTextAreaElement, JSONInputProps>(function JSONInput(
  {
    label,
    description,
    error: externalError,
    value: controlledValue,
    defaultValue,
    onChange,
    formatOnBlur = true,
    size = 'md',
    disabled,
    maxHeight,
    className,
    id,
  },
  ref,
) {
  const s = sizeStyles[size];
  const inputId = id || (label ? `jsoninput-${Math.random().toString(36).slice(2, 9)}` : undefined);

  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');
  const [validationError, setValidationError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lineNumbersRef = useRef<HTMLDivElement | null>(null);

  const currentValue = isControlled ? controlledValue : internalValue;
  const lineCount = useMemo(() => countLines(currentValue), [currentValue]);
  const displayError = externalError ?? validationError;
  const hasError = !!displayError;

  const setRefs = useCallback(
    (node: HTMLTextAreaElement | null) => {
      textareaRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      }
    },
    [ref],
  );

  const validate = useCallback((val: string): boolean => {
    if (val.trim() === '') {
      setValidationError(null);
      return true;
    }
    const valid = isValidJSON(val);
    setValidationError(valid ? null : 'Invalid JSON syntax');
    return valid;
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      if (!isControlled) {
        setInternalValue(newValue);
      }
      const valid = validate(newValue);
      onChange?.(newValue, valid);
    },
    [isControlled, onChange, validate],
  );

  const handleBlur = useCallback(() => {
    if (!formatOnBlur) {
      return;
    }
    const val = isControlled ? (controlledValue ?? '') : internalValue;
    if (val.trim() === '' || !isValidJSON(val)) {
      return;
    }
    const formatted = formatJSON(val);
    if (formatted !== val) {
      if (!isControlled) {
        setInternalValue(formatted);
      }
      onChange?.(formatted, true);
    }
  }, [formatOnBlur, isControlled, controlledValue, internalValue, onChange]);

  // Sync scroll between textarea and line numbers
  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // Validate on mount if there's a default value
  useEffect(() => {
    if (defaultValue) {
      validate(defaultValue);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <div
        className={[
          'flex border rounded-xl overflow-hidden transition-all duration-200',
          hasError
            ? 'border-danger focus-within:ring-2 focus-within:ring-danger/30 focus-within:border-danger'
            : 'border-input-border focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
        ].filter(Boolean).join(' ')}
        style={{ maxHeight }}
      >
        {/* Line numbers gutter */}
        <div
          ref={lineNumbersRef}
          className={[
            'select-none text-right text-text-muted bg-surface-lighter border-r border-input-border overflow-hidden shrink-0 font-mono leading-relaxed',
            s.lineNumber,
          ].join(' ')}
          aria-hidden="true"
          data-testid="json-input-line-numbers"
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        {/* Textarea */}
        <textarea
          ref={setRefs}
          id={inputId}
          disabled={disabled}
          value={currentValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onScroll={handleScroll}
          spellCheck={false}
          className={[
            'flex-1 bg-surface text-text outline-none resize-vertical font-mono leading-relaxed',
            s.textarea,
            disabled ? 'cursor-not-allowed bg-surface-lighter' : '',
          ].filter(Boolean).join(' ')}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? `${inputId}-error` : undefined}
          data-testid="json-input-textarea"
        />
      </div>
      {displayError && (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs text-danger" data-testid="json-input-error">
          {displayError}
        </p>
      )}
    </div>
  );
});

JSONInput.displayName = 'JSONInput';
