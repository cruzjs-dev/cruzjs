import React, { forwardRef, useCallback, useEffect, useId, useRef, useState } from 'react';

export type CollapsibleProps = React.HTMLAttributes<HTMLDivElement> & {
  trigger: React.ReactNode;
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
};

export const Collapsible = forwardRef<HTMLDivElement, CollapsibleProps>(function Collapsible(
  {
    trigger,
    children,
    open: controlledOpen,
    defaultOpen = false,
    onOpenChange,
    disabled = false,
    className,
    ...rest
  },
  ref,
) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  const uniqueId = useId();
  const triggerId = `collapsible-trigger-${uniqueId}`;
  const contentId = `collapsible-content-${uniqueId}`;

  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [children, isOpen]);

  const toggle = useCallback(() => {
    if (disabled) {
      return;
    }
    const next = !isOpen;
    if (!isControlled) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  }, [disabled, isOpen, isControlled, onOpenChange]);

  return (
    <div ref={ref} className={className} {...rest}>
      <button
        type="button"
        id={triggerId}
        aria-expanded={isOpen}
        aria-controls={contentId}
        disabled={disabled}
        onClick={toggle}
        className={[
          'flex w-full items-center justify-between gap-4 text-left',
          'py-3 px-1',
          'transition-colors duration-150',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-surface-lighter/50',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset',
          'rounded-lg',
        ].join(' ')}
      >
        <div className="flex-1 min-w-0 text-sm font-medium text-text-strong">
          {trigger}
        </div>
        <svg
          className="w-4 h-4 shrink-0 text-text-tertiary transition-transform duration-300"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        id={contentId}
        role="region"
        aria-labelledby={triggerId}
        style={{
          height: isOpen ? height : 0,
          opacity: isOpen ? 1 : 0,
          transition: 'height 300ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms ease',
          overflow: 'hidden',
        }}
      >
        <div ref={contentRef} className="pb-3 px-1">
          <div className="text-sm text-text-secondary leading-relaxed">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
});

Collapsible.displayName = 'Collapsible';
