import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';

export type AccordionVariant = 'default' | 'bordered' | 'separated';

export type AccordionProps = React.HTMLAttributes<HTMLDivElement> & {
  type?: 'single' | 'multiple';
  defaultValue?: string[];
  variant?: AccordionVariant;
  children: React.ReactNode;
};

export type AccordionItemProps = {
  value: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  disabled?: boolean;
  children: React.ReactNode;
};

type AccordionContextType = {
  expandedItems: string[];
  toggle: (value: string) => void;
  variant: AccordionVariant;
};

const AccordionContext = React.createContext<AccordionContextType>({
  expandedItems: [],
  toggle: () => {},
  variant: 'default',
});

export const Accordion = forwardRef<HTMLDivElement, AccordionProps>(function Accordion(
  {
    type = 'single',
    defaultValue = [],
    variant = 'default',
    children,
    className,
    ...rest
  },
  ref,
) {
  const [expandedItems, setExpandedItems] = useState<string[]>(defaultValue);

  const toggle = useCallback(
    (value: string) => {
      setExpandedItems((prev) => {
        if (prev.includes(value)) {
          return prev.filter((v) => v !== value);
        }
        return type === 'single' ? [value] : [...prev, value];
      });
    },
    [type],
  );

  const variantClasses: Record<AccordionVariant, string> = {
    default: 'divide-y divide-surface-border',
    bordered: 'divide-y divide-surface-border rounded-2xl border border-surface-border',
    separated: 'space-y-3',
  };

  return (
    <AccordionContext.Provider value={{ expandedItems, toggle, variant }}>
      <div
        ref={ref}
        className={[variantClasses[variant], className].filter(Boolean).join(' ')}
        {...rest}
      >
        {children}
      </div>
    </AccordionContext.Provider>
  );
});

Accordion.displayName = 'Accordion';

export function AccordionItem({ value, title, subtitle, disabled = false, children }: AccordionItemProps) {
  const { expandedItems, toggle, variant } = React.useContext(AccordionContext);
  const isExpanded = expandedItems.includes(value);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [children, isExpanded]);

  const separatedClasses = variant === 'separated'
    ? 'rounded-2xl border border-surface-border'
    : '';

  return (
    <div className={separatedClasses}>
      <button
        type="button"
        onClick={() => !disabled && toggle(value)}
        disabled={disabled}
        aria-expanded={isExpanded}
        aria-controls={`accordion-content-${value}`}
        id={`accordion-trigger-${value}`}
        className={[
          'flex w-full items-center justify-between gap-4 text-left',
          variant === 'bordered' ? 'px-5 py-4' : variant === 'separated' ? 'px-5 py-4' : 'py-4',
          'transition-colors duration-150',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-surface-lighter/50',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset',
        ].join(' ')}
      >
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-text-strong">{title}</span>
          {subtitle && (
            <span className="block mt-0.5 text-xs text-text-tertiary">{subtitle}</span>
          )}
        </div>
        <svg
          className={[
            'w-4 h-4 shrink-0 text-text-tertiary transition-transform duration-300',
          ].join(' ')}
          style={{
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
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
        id={`accordion-content-${value}`}
        role="region"
        aria-labelledby={`accordion-trigger-${value}`}
        style={{
          height: isExpanded ? height : 0,
          opacity: isExpanded ? 1 : 0,
          transition: 'height 300ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms ease',
          overflow: 'hidden',
        }}
      >
        <div
          ref={contentRef}
          className={[
            variant === 'bordered' ? 'px-5 pb-4' : variant === 'separated' ? 'px-5 pb-4' : 'pb-4',
          ].join(' ')}
        >
          <div className="text-sm text-text-secondary leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}

AccordionItem.displayName = 'AccordionItem';
