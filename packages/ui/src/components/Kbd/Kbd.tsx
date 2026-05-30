import React, { forwardRef } from 'react';

export type KbdSize = 'sm' | 'md' | 'lg';

export type KbdProps = React.HTMLAttributes<HTMLElement> & {
  keys?: string[];
  size?: KbdSize;
  separator?: React.ReactNode;
};

const sizeStyles: Record<KbdSize, string> = {
  sm: 'px-1 py-0.5 text-[10px]',
  md: 'px-1.5 py-0.5 text-xs',
  lg: 'px-2 py-1 text-sm',
};

const keyCap =
  'inline-flex items-center justify-center bg-surface-lighter ring-1 ring-surface-border/50 shadow-[0_1px_0_1px_rgba(0,0,0,0.05)] rounded-md font-mono text-text-secondary font-medium leading-none';

export const Kbd = forwardRef<HTMLElement, KbdProps>(function Kbd(
  {
    keys,
    size = 'md',
    separator = '+',
    children,
    className,
    ...rest
  },
  ref,
) {
  const sizeClass = sizeStyles[size];

  // When keys array is provided, render each key in its own cap with separator
  if (keys && keys.length > 0) {
    return (
      <kbd
        ref={ref}
        className={['inline-flex items-center gap-0.5', className]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {keys.map((key, index) => (
          <React.Fragment key={index}>
            {index > 0 && (
              <span className="text-text-muted text-xs mx-0.5">{separator}</span>
            )}
            <span className={[keyCap, sizeClass].join(' ')}>{key}</span>
          </React.Fragment>
        ))}
      </kbd>
    );
  }

  // Simple children usage: single key display
  return (
    <kbd
      ref={ref}
      className={[
        keyCap,
        sizeClass,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </kbd>
  );
});

Kbd.displayName = 'Kbd';
