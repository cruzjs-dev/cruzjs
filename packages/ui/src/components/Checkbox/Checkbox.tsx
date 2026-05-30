import React, { forwardRef, useEffect, useRef } from 'react';

export type CheckboxSize = 'sm' | 'md' | 'lg';
export type CheckboxColor = 'primary' | 'success' | 'danger';

export type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> & {
  label?: React.ReactNode;
  description?: string;
  error?: string;
  size?: CheckboxSize;
  indeterminate?: boolean;
  color?: CheckboxColor;
};

// ─── Size Tokens ───────────────────────────────────────────────────────────────

const boxSizeStyles: Record<CheckboxSize, string> = {
  sm: 'w-4 h-4 rounded-md',
  md: 'w-5 h-5 rounded-lg',
  lg: 'w-6 h-6 rounded-lg',
};

const labelSizeStyles: Record<CheckboxSize, string> = {
  sm: 'text-sm',
  md: 'text-sm',
  lg: 'text-base',
};

const iconSizeStyles: Record<CheckboxSize, { width: number; height: number }> = {
  sm: { width: 10, height: 10 },
  md: { width: 12, height: 12 },
  lg: { width: 14, height: 14 },
};

// ─── Color Tokens ──────────────────────────────────────────────────────────────

const checkedColorStyles: Record<CheckboxColor, string> = {
  primary: 'bg-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]',
  success: 'bg-success shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]',
  danger: 'bg-danger shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]',
};

// ─── Icons ─────────────────────────────────────────────────────────────────────

const CheckIcon: React.FC<{ width: number; height: number }> = ({ width, height }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 12 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M2.5 6.5L5 9L9.5 3.5"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IndeterminateIcon: React.FC<{ width: number; height: number }> = ({ width, height }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 12 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M2.5 6H9.5"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

// ─── Component ─────────────────────────────────────────────────────────────────

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  {
    label,
    description,
    error,
    size = 'md',
    indeterminate = false,
    color = 'primary',
    disabled = false,
    checked,
    defaultChecked,
    className,
    id,
    onChange,
    ...rest
  },
  forwardedRef,
) {
  const internalRef = useRef<HTMLInputElement>(null);

  // Merge forwarded ref with internal ref
  const setRef = (node: HTMLInputElement | null) => {
    (internalRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
    } else if (forwardedRef) {
      (forwardedRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
    }
  };

  // Set indeterminate property on the native input
  useEffect(() => {
    if (internalRef.current) {
      internalRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  const isChecked = checked ?? defaultChecked ?? false;
  const isFilled = isChecked || indeterminate;
  const iconSize = iconSizeStyles[size];

  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  const boxClasses = [
    'relative flex items-center justify-center shrink-0 border transition-all duration-200',
    boxSizeStyles[size],
    isFilled
      ? `${checkedColorStyles[color]} border-transparent`
      : 'border-input-border bg-surface hover:border-text-muted',
    disabled && 'opacity-50 cursor-not-allowed',
    'peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 peer-focus-visible:ring-offset-2',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={['flex flex-col gap-1', className].filter(Boolean).join(' ')}>
      <label
        htmlFor={inputId}
        className={[
          'inline-flex items-start gap-2',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        <input
          ref={setRef}
          type="checkbox"
          id={inputId}
          checked={checked}
          defaultChecked={defaultChecked}
          disabled={disabled}
          onChange={onChange}
          className="peer sr-only"
          aria-describedby={
            [descriptionId, errorId].filter(Boolean).join(' ') || undefined
          }
          aria-invalid={error ? true : undefined}
          {...rest}
        />

        <span
          className={boxClasses}
          aria-hidden="true"
          style={{
            transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {isFilled && (
            <span
              className="flex items-center justify-center"
              style={{
                animation: 'checkbox-pop 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              {indeterminate ? (
                <IndeterminateIcon width={iconSize.width} height={iconSize.height} />
              ) : (
                <CheckIcon width={iconSize.width} height={iconSize.height} />
              )}
            </span>
          )}
        </span>

        {(label || description) && (
          <span className="flex flex-col gap-0.5 min-w-0 pt-px">
            {label && (
              <span
                className={[
                  'font-medium text-text leading-tight',
                  labelSizeStyles[size],
                  disabled && 'opacity-50',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {label}
              </span>
            )}
            {description && (
              <span
                id={descriptionId}
                className={[
                  'text-xs text-text-tertiary leading-snug',
                  disabled && 'opacity-50',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {description}
              </span>
            )}
          </span>
        )}
      </label>

      {error && (
        <span id={errorId} className="text-xs text-danger ml-0" role="alert">
          {error}
        </span>
      )}
    </div>
  );
});

Checkbox.displayName = 'Checkbox';
