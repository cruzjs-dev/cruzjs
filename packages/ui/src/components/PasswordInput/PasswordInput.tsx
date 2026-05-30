import React, { forwardRef, useState } from 'react';

export type PasswordInputSize = 'sm' | 'md' | 'lg';

export type PasswordInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> & {
  label?: React.ReactNode;
  description?: string;
  error?: string;
  size?: PasswordInputSize;
};

const sizeStyles: Record<PasswordInputSize, { input: string; label: string; toggle: string }> = {
  sm: { input: 'h-8 px-3 pr-8 text-xs rounded-lg', label: 'text-xs', toggle: 'right-1.5 w-5 h-5 p-0.5' },
  md: { input: 'h-10 px-3.5 pr-10 text-sm rounded-xl', label: 'text-sm', toggle: 'right-2 w-6 h-6 p-0.5' },
  lg: { input: 'h-12 px-4 pr-12 text-base rounded-xl', label: 'text-sm', toggle: 'right-3 w-7 h-7 p-1' },
};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { label, description, error, size = 'md', disabled, className, id, ...rest },
  ref,
) {
  const [visible, setVisible] = useState(false);
  const s = sizeStyles[size];
  const inputId = id || (label ? `password-${Math.random().toString(36).slice(2, 9)}` : undefined);
  const hasError = !!error;

  return (
    <div className={['w-full', className].filter(Boolean).join(' ')}>
      {label && (
        <label htmlFor={inputId} className={['block font-medium text-text-secondary mb-1.5', s.label].join(' ')}>
          {label}
        </label>
      )}
      {description && <p className="text-xs text-text-tertiary mb-1.5">{description}</p>}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={visible ? 'text' : 'password'}
          disabled={disabled}
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
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className={[
            'absolute top-1/2 -translate-y-1/2 rounded-lg text-text-muted',
            'hover:text-text-secondary hover:bg-surface-lighter',
            'transition-colors duration-150',
            s.toggle,
          ].join(' ')}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs text-danger">{error}</p>
      )}
    </div>
  );
});

PasswordInput.displayName = 'PasswordInput';

function EyeIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="w-full h-full">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}
