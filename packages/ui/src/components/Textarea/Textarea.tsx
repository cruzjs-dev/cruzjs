import React, { forwardRef, useEffect, useRef, useCallback } from 'react';

export type TextareaSize = 'sm' | 'md' | 'lg';

export type TextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> & {
  label?: React.ReactNode;
  description?: string;
  error?: string;
  size?: TextareaSize;
  autoResize?: boolean;
  maxLength?: number;
  showCount?: boolean;
};

const sizeStyles: Record<TextareaSize, { textarea: string; label: string }> = {
  sm: { textarea: 'text-xs px-3 py-2', label: 'text-xs' },
  md: { textarea: 'text-sm px-3.5 py-2.5', label: 'text-sm' },
  lg: { textarea: 'text-base px-4 py-3', label: 'text-sm' },
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    label,
    description,
    error,
    size = 'md',
    autoResize = false,
    maxLength,
    showCount = false,
    disabled,
    className,
    id,
    value,
    defaultValue,
    onChange,
    ...rest
  },
  ref,
) {
  const s = sizeStyles[size];
  const internalRef = useRef<HTMLTextAreaElement | null>(null);
  const textareaId = id || (label ? `textarea-${Math.random().toString(36).slice(2, 9)}` : undefined);
  const hasError = !!error;

  const setRefs = useCallback(
    (node: HTMLTextAreaElement | null) => {
      internalRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      }
    },
    [ref],
  );

  const adjustHeight = useCallback(() => {
    const el = internalRef.current;
    if (!el || !autoResize) {
      return;
    }
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [autoResize]);

  useEffect(() => {
    adjustHeight();
  }, [adjustHeight, value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(e);
    if (autoResize) {
      adjustHeight();
    }
  };

  const currentLength = typeof value === 'string'
    ? value.length
    : typeof defaultValue === 'string'
      ? defaultValue.length
      : internalRef.current?.value.length ?? 0;

  const showCharCount = showCount || maxLength !== undefined;
  const isOverLimit = maxLength !== undefined && currentLength > maxLength;

  return (
    <div className={['w-full', className].filter(Boolean).join(' ')}>
      {label && (
        <label
          htmlFor={textareaId}
          className={['block font-medium text-text-secondary mb-1.5', s.label].join(' ')}
        >
          {label}
        </label>
      )}
      {description && (
        <p className="text-xs text-text-tertiary mb-1.5">{description}</p>
      )}
      <textarea
        ref={setRefs}
        id={textareaId}
        disabled={disabled}
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        maxLength={maxLength}
        className={[
          'w-full border bg-surface text-text outline-none transition-all duration-200 rounded-xl',
          s.textarea,
          autoResize ? 'resize-none overflow-hidden' : 'resize-vertical',
          hasError
            ? 'border-danger focus:ring-2 focus:ring-danger/30 focus:border-danger'
            : 'border-input-border focus:ring-2 focus:ring-primary/50 focus:border-primary',
          disabled ? 'opacity-50 cursor-not-allowed bg-surface-lighter' : '',
          'placeholder:text-text-muted',
        ].filter(Boolean).join(' ')}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? `${textareaId}-error` : undefined}
        {...rest}
      />
      <div className="flex justify-between items-start mt-1.5">
        <div className="flex-1">
          {error && (
            <p id={`${textareaId}-error`} className="text-xs text-danger">{error}</p>
          )}
        </div>
        {showCharCount && (
          <span
            className={[
              'text-xs tabular-nums ml-2 shrink-0',
              isOverLimit ? 'text-danger' : 'text-text-tertiary',
            ].join(' ')}
          >
            {maxLength !== undefined ? `${currentLength}/${maxLength}` : currentLength}
          </span>
        )}
      </div>
    </div>
  );
});

Textarea.displayName = 'Textarea';
