import React, { forwardRef } from 'react';

export type ActionBarProps = React.HTMLAttributes<HTMLDivElement> & {
  count: number;
  open?: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  countLabel?: (count: number) => string;
};

const defaultCountLabel = (count: number): string => `${count} selected`;

export const ActionBar = forwardRef<HTMLDivElement, ActionBarProps>(function ActionBar(
  {
    count,
    open,
    onClose,
    children,
    countLabel = defaultCountLabel,
    className,
    ...rest
  },
  ref,
) {
  const isVisible = open ?? count > 0;

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label={countLabel(count)}
      aria-hidden={!isVisible}
      className={[
        'fixed bottom-6 left-1/2 z-50 inline-flex items-center gap-3 px-4 py-2.5',
        '-translate-x-1/2 rounded-xl',
        'bg-dark-surface text-dark-text',
        'shadow-[0_12px_32px_-4px_rgba(0,0,0,0.2),0_24px_48px_-12px_rgba(0,0,0,0.15)]',
        'motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-[var(--ease-spring)]',
        isVisible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-4 opacity-0 pointer-events-none',
        'max-sm:left-3 max-sm:right-3 max-sm:translate-x-0 max-sm:w-auto max-sm:flex max-sm:justify-between',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {/* Count badge */}
      <span className="bg-primary text-surface text-xs font-semibold rounded-full px-2 py-0.5 whitespace-nowrap">
        {countLabel(count)}
      </span>

      {/* Divider */}
      <div className="border-l border-dark-border h-5" aria-hidden="true" />

      {/* Action buttons */}
      <div className="inline-flex items-center gap-2">
        {children}
      </div>

      {/* Close button */}
      {onClose && (
        <>
          <div className="border-l border-dark-border h-5" aria-hidden="true" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Deselect all"
            className="text-dark-text-muted hover:text-dark-text transition-colors duration-150 p-0.5 rounded-md"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
});

ActionBar.displayName = 'ActionBar';
