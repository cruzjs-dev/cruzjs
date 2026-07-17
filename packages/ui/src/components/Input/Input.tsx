import React, { forwardRef, useId } from 'react';

export type InputSize = 'sm' | 'md' | 'lg';

export type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  label?: React.ReactNode;
  description?: string;
  error?: string;
  size?: InputSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
};

const sizeStyles: Record<InputSize, { input: string; label: string; icon: string }> = {
  sm: { input: 'h-8 px-3 text-xs rounded-lg', label: 'text-xs', icon: 'w-3.5 h-3.5' },
  md: { input: 'h-10 px-3.5 text-sm rounded-xl', label: 'text-sm', icon: 'w-4 h-4' },
  lg: { input: 'h-12 px-4 text-base rounded-xl', label: 'text-sm', icon: 'w-5 h-5' },
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    description,
    error,
    size = 'md',
    leftIcon,
    rightIcon,
    leftAddon,
    rightAddon,
    disabled,
    className,
    id,
    ...rest
  },
  ref,
) {
  const s = sizeStyles[size];
  // Stable id across SSR and hydration (Math.random() caused hydration mismatches).
  const generatedId = useId();
  const inputId = id || (label ? generatedId : undefined);
  const hasError = !!error;

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
      <div className="relative flex">
        {leftAddon && (
          <span className={[
            'inline-flex items-center border border-r-0 border-input-border bg-surface-lighter px-3 text-text-tertiary',
            size === 'sm' ? 'rounded-l-lg text-xs' : 'rounded-l-xl text-sm',
          ].join(' ')}>
            {leftAddon}
          </span>
        )}
        <div className="relative flex-1">
          {leftIcon && (
            <span className={[
              'absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none',
              s.icon,
            ].join(' ')}>
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={[
              'w-full border bg-surface text-text outline-none transition-all duration-200',
              s.input,
              leftIcon ? (size === 'sm' ? 'pl-8' : 'pl-10') : '',
              rightIcon ? (size === 'sm' ? 'pr-8' : 'pr-10') : '',
              leftAddon ? 'rounded-l-none' : '',
              rightAddon ? 'rounded-r-none' : '',
              hasError
                ? 'border-danger focus:ring-2 focus:ring-danger/30 focus:border-danger'
                : 'border-input-border focus:ring-2 focus:ring-primary/50 focus:border-primary',
              disabled ? 'opacity-50 cursor-not-allowed bg-surface-lighter' : '',
              'placeholder:text-text-muted',
            ].filter(Boolean).join(' ')}
            aria-invalid={hasError || undefined}
            aria-describedby={hasError ? `${inputId}-error` : undefined}
            {...rest}
          />
          {rightIcon && (
            <span className={[
              'absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none',
              s.icon,
            ].join(' ')}>
              {rightIcon}
            </span>
          )}
        </div>
        {rightAddon && (
          <span className={[
            'inline-flex items-center border border-l-0 border-input-border bg-surface-lighter px-3 text-text-tertiary',
            size === 'sm' ? 'rounded-r-lg text-xs' : 'rounded-r-xl text-sm',
          ].join(' ')}>
            {rightAddon}
          </span>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs text-danger">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
