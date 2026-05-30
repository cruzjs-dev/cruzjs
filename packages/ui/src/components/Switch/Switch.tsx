import React, { forwardRef, useCallback, useId, useState } from 'react';

export type SwitchSize = 'sm' | 'md' | 'lg';
export type SwitchColor = 'primary' | 'success' | 'danger';

export type SwitchProps = Omit<React.HTMLAttributes<HTMLButtonElement>, 'onChange' | 'role'> & {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: string;
  size?: SwitchSize;
  color?: SwitchColor;
  disabled?: boolean;
  name?: string;
};

const sizeStyles: Record<
  SwitchSize,
  { track: string; thumb: string; thumbTranslate: string; thumbActive: string }
> = {
  sm: {
    track: 'w-8 h-5',
    thumb: 'w-3.5 h-3.5',
    thumbTranslate: 'translateX(14px)',
    thumbActive: 'w-4',
  },
  md: {
    track: 'w-10 h-6',
    thumb: 'w-4.5 h-4.5',
    thumbTranslate: 'translateX(16px)',
    thumbActive: 'w-5.5',
  },
  lg: {
    track: 'w-12 h-7',
    thumb: 'w-5.5 h-5.5',
    thumbTranslate: 'translateX(20px)',
    thumbActive: 'w-6.5',
  },
};

const colorStyles: Record<SwitchColor, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  danger: 'bg-danger',
};

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  {
    checked: controlledChecked,
    defaultChecked = false,
    onChange,
    label,
    description,
    size = 'md',
    color = 'primary',
    disabled = false,
    className,
    id: externalId,
    name,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const id = externalId ?? generatedId;
  const descriptionId = description ? `${id}-description` : undefined;

  const isControlled = controlledChecked !== undefined;
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const isChecked = isControlled ? controlledChecked : internalChecked;

  const styles = sizeStyles[size];

  const handleToggle = useCallback(() => {
    if (disabled) {
      return;
    }
    const next = !isChecked;
    if (!isControlled) {
      setInternalChecked(next);
    }
    onChange?.(next);
  }, [disabled, isChecked, isControlled, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleToggle();
      }
    },
    [handleToggle],
  );

  return (
    <div
      className={[
        'inline-flex items-start gap-3',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        ref={ref}
        id={id}
        type="button"
        role="switch"
        aria-checked={isChecked}
        aria-describedby={descriptionId}
        disabled={disabled}
        name={name}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={[
          'relative inline-flex shrink-0 items-center rounded-full',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed',
          styles.track,
          isChecked ? colorStyles[color] : 'bg-surface-border',
          'transition-colors duration-200',
        ].join(' ')}
        {...rest}
      >
        <span
          aria-hidden="true"
          className={[
            'inline-block rounded-full bg-white',
            'shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.06)]',
            styles.thumb,
            'active:' + styles.thumbActive,
          ].join(' ')}
          style={{
            transform: isChecked ? styles.thumbTranslate : 'translateX(2px)',
            transition: 'transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1), width 100ms ease',
          }}
        />
      </button>

      {(label || description) && (
        <div className="flex flex-col gap-0.5 select-none" onClick={disabled ? undefined : handleToggle}>
          {label && (
            <label
              htmlFor={id}
              className={[
                'text-sm font-medium text-text-primary leading-tight',
                disabled ? 'cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}
            >
              {label}
            </label>
          )}
          {description && (
            <span id={descriptionId} className="text-xs text-text-secondary leading-snug">
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

Switch.displayName = 'Switch';
