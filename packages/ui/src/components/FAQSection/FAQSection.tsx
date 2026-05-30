import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

export type FAQItem = {
  id: string;
  question: string;
  answer: React.ReactNode;
  category?: string;
};

export type FAQSectionProps = React.HTMLAttributes<HTMLElement> & {
  items: FAQItem[];
  heading?: React.ReactNode;
  description?: React.ReactNode;
  showSearch?: boolean;
  searchPlaceholder?: string;
  categories?: string[];
  allowMultiple?: boolean;
};

// ─── AccordionItem (internal) ───────────────────────────────────────────────

function FAQAccordionItem({
  item,
  isExpanded,
  onToggle,
}: {
  item: FAQItem;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [item.answer, isExpanded]);

  return (
    <div className="border-b border-surface-border" data-testid={`faq-item-${item.id}`}>
      <button
        type="button"
        onClick={() => onToggle(item.id)}
        aria-expanded={isExpanded}
        aria-controls={`faq-content-${item.id}`}
        id={`faq-trigger-${item.id}`}
        className={[
          'flex w-full items-center justify-between gap-4 py-4 text-left',
          'transition-colors duration-150',
          'cursor-pointer hover:bg-surface-lighter/50',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset',
        ].join(' ')}
      >
        <span className="flex-1 min-w-0 text-sm font-medium text-text">{item.question}</span>
        <svg
          className="w-4 h-4 shrink-0 text-text-secondary transition-transform duration-300"
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
        id={`faq-content-${item.id}`}
        role="region"
        aria-labelledby={`faq-trigger-${item.id}`}
        style={{
          height: isExpanded ? height : 0,
          opacity: isExpanded ? 1 : 0,
          transition: 'height 300ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms ease',
          overflow: 'hidden',
        }}
      >
        <div ref={contentRef} className="pb-4">
          <div className="text-sm text-text-secondary leading-relaxed">{item.answer}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Search icon (inline SVG) ───────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg
      className="w-4 h-4 text-text-secondary"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    </svg>
  );
}

// ─── FAQSection ─────────────────────────────────────────────────────────────

export const FAQSection = forwardRef<HTMLElement, FAQSectionProps>(function FAQSection(
  {
    items,
    heading,
    description,
    showSearch = false,
    searchPlaceholder = 'Search questions...',
    categories,
    allowMultiple = false,
    className,
    ...rest
  },
  ref,
) {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const toggle = useCallback(
    (id: string) => {
      setExpandedItems((prev) => {
        if (prev.includes(id)) {
          return prev.filter((v) => v !== id);
        }
        return allowMultiple ? [...prev, id] : [id];
      });
    },
    [allowMultiple],
  );

  const filteredItems = useMemo(() => {
    let result = items;

    // Filter by category
    if (activeCategory) {
      result = result.filter((item) => item.category === activeCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter((item) => item.question.toLowerCase().includes(query));
    }

    return result;
  }, [items, activeCategory, searchQuery]);

  const sectionClassName = [
    'w-full',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section
      ref={ref}
      className={sectionClassName}
      data-testid="faq-section"
      {...rest}
    >
      {/* Heading + Description */}
      {(heading || description) && (
        <div className="mb-8 text-center">
          {heading && (
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-text">
              {heading}
            </h2>
          )}
          {description && (
            <p className="mt-2 text-base text-text-secondary max-w-2xl mx-auto">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Search */}
      {showSearch && (
        <div className="mb-6 max-w-md mx-auto" data-testid="faq-search">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <SearchIcon />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className={[
                'w-full pl-10 pr-4 py-2 text-sm rounded-lg',
                'bg-surface border border-surface-border text-text',
                'placeholder:text-text-secondary',
                'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
                'transition-colors duration-150',
              ].join(' ')}
              aria-label="Search FAQ"
            />
          </div>
        </div>
      )}

      {/* Category tabs */}
      {categories && categories.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2 justify-center" data-testid="faq-categories">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={[
              'px-3 py-1.5 text-sm font-medium rounded-full transition-colors duration-150',
              activeCategory === null
                ? 'bg-primary-subtle text-primary'
                : 'bg-surface text-text-secondary hover:bg-surface-lighter',
            ].join(' ')}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={[
                'px-3 py-1.5 text-sm font-medium rounded-full transition-colors duration-150',
                activeCategory === category
                  ? 'bg-primary-subtle text-primary'
                  : 'bg-surface text-text-secondary hover:bg-surface-lighter',
              ].join(' ')}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {/* FAQ items */}
      <div className="max-w-3xl mx-auto">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <FAQAccordionItem
              key={item.id}
              item={item}
              isExpanded={expandedItems.includes(item.id)}
              onToggle={toggle}
            />
          ))
        ) : (
          <p className="text-center text-sm text-text-secondary py-8" data-testid="faq-empty">
            No matching questions found.
          </p>
        )}
      </div>
    </section>
  );
});

FAQSection.displayName = 'FAQSection';
