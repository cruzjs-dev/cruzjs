import React, { forwardRef, useState, useCallback, useRef, useEffect } from 'react';

export type CopyButtonSize = 'sm' | 'md' | 'lg';
export type CopyButtonVariant = 'solid' | 'outline' | 'ghost';

export type CopyButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  value: string;
  label?: string;
  copiedLabel?: string;
  timeout?: number;
  size?: CopyButtonSize;
  variant?: CopyButtonVariant;
  disabled?: boolean;
  className?: string;
};

const sizeStyles: Record<CopyButtonSize, string> = {
  sm: 'px-2 py-1 text-xs gap-1',
  md: 'px-3 py-1.5 text-sm gap-1.5',
  lg: 'px-4 py-2 text-base gap-2',
};

const iconSizeStyles: Record<CopyButtonSize, string> = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

const variantStyles: Record<CopyButtonVariant, string> = {
  solid: 'bg-primary text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:brightness-110',
  outline: 'ring-1 ring-surface-border text-text-secondary bg-surface hover:bg-surface-lighter',
  ghost: 'text-text-secondary hover:bg-surface-lighter',
};

const ClipboardIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const CopyButton = forwardRef<HTMLButtonElement, CopyButtonProps>(function CopyButton(
  {
    value,
    label = 'Copy',
    copiedLabel = 'Copied!',
    timeout = 2000,
    size = 'md',
    variant = 'outline',
    disabled = false,
    className,
    onClick,
    ...rest
  },
  ref,
) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) {
        return;
      }

      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);

        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
          setCopied(false);
          timerRef.current = null;
        }, timeout);
      } catch {
        // Clipboard API not available or permission denied
      }

      onClick?.(e);
    },
    [value, timeout, disabled, onClick],
  );

  const displayLabel = copied ? copiedLabel : label;
  const iconClass = iconSizeStyles[size];

  return (
    <button
      ref={ref}
      type="button"
      className={[
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-150',
        sizeStyles[size],
        variantStyles[variant],
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'cursor-pointer',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={disabled}
      aria-label={copied ? 'Copied' : label}
      onClick={handleClick}
      {...rest}
    >
      <span
        className="inline-flex transition-transform"
        style={{
          transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          transitionDuration: '200ms',
          transform: copied ? 'scale(1.15)' : 'scale(1)',
        }}
      >
        {copied ? (
          <CheckIcon className={[iconClass, 'text-success'].join(' ')} />
        ) : (
          <ClipboardIcon className={iconClass} />
        )}
      </span>
      {displayLabel}
    </button>
  );
});

CopyButton.displayName = 'CopyButton';
