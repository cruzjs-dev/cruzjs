import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
};

export type SelectSize = 'sm' | 'md' | 'lg';

export type SelectProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'onChange'> & {
  label?: React.ReactNode;
  description?: string;
  error?: string;
  size?: SelectSize;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string | undefined) => void;
  placeholder?: string;
  searchable?: boolean;
  clearable?: boolean;
  disabled?: boolean;
};

const sizeStyles: Record<SelectSize, { trigger: string; label: string; option: string; icon: string }> = {
  sm: {
    trigger: 'h-8 px-3 text-xs rounded-lg',
    label: 'text-xs',
    option: 'px-3 py-1.5 text-xs',
    icon: 'w-3.5 h-3.5',
  },
  md: {
    trigger: 'h-10 px-3.5 text-sm rounded-xl',
    label: 'text-sm',
    option: 'px-3.5 py-2 text-sm',
    icon: 'w-4 h-4',
  },
  lg: {
    trigger: 'h-12 px-4 text-base rounded-xl',
    label: 'text-sm',
    option: 'px-4 py-2.5 text-base min-h-[44px]',
    icon: 'w-5 h-5',
  },
};

export const Select = forwardRef<HTMLInputElement, SelectProps>(function Select(
  {
    label,
    description,
    error,
    size = 'md',
    options,
    value: controlledValue,
    defaultValue,
    onChange,
    placeholder = 'Select...',
    searchable = false,
    clearable = false,
    disabled = false,
    className,
    id,
    name,
    ...rest
  },
  ref,
) {
  const isMobile = useIsMobile();
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState<string | undefined>(defaultValue);
  const currentValue = isControlled ? controlledValue : internalValue;

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPosition, setPanelPosition] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  });

  const s = sizeStyles[size];
  const inputId = id ?? (label ? `select-${Math.random().toString(36).slice(2, 9)}` : undefined);
  const listboxId = `${inputId ?? 'select'}-listbox`;
  const hasError = !!error;

  const selectedOption = useMemo(
    () => options.find((o) => o.value === currentValue),
    [options, currentValue],
  );

  const filteredOptions = useMemo(() => {
    if (!search) {
      return options;
    }
    const lower = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(lower));
  }, [options, search]);

  const groupedOptions = useMemo(() => {
    const groups: { key: string | null; label: string | null; options: SelectOption[] }[] = [];
    const groupMap = new Map<string | null, SelectOption[]>();

    for (const opt of filteredOptions) {
      const groupKey = opt.group ?? null;
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, []);
        groups.push({ key: groupKey, label: groupKey, options: groupMap.get(groupKey)! });
      }
      groupMap.get(groupKey)!.push(opt);
    }

    return groups;
  }, [filteredOptions]);

  const flatFiltered = useMemo(() => filteredOptions.filter((o) => !o.disabled), [filteredOptions]);

  const updatePanelPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const vh = window.innerHeight;
    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;
    const panelHeight = 300;

    let top: number;
    if (spaceBelow >= panelHeight || spaceBelow >= spaceAbove) {
      top = rect.bottom + 4;
    } else {
      top = rect.top - Math.min(panelHeight, spaceAbove) - 4;
    }

    setPanelPosition({
      top,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  const handleSelect = useCallback(
    (optionValue: string) => {
      if (!isControlled) {
        setInternalValue(optionValue);
      }
      onChange?.(optionValue);
      setOpen(false);
      setSearch('');
      setHighlightedIndex(-1);
      triggerRef.current?.focus();
    },
    [isControlled, onChange],
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isControlled) {
        setInternalValue(undefined);
      }
      onChange?.(undefined);
      triggerRef.current?.focus();
    },
    [isControlled, onChange],
  );

  const handleOpen = useCallback(() => {
    if (disabled) {
      return;
    }
    setOpen(true);
    setSearch('');
    const currentIndex = flatFiltered.findIndex((o) => o.value === currentValue);
    setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
  }, [disabled, flatFiltered, currentValue]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setSearch('');
    setHighlightedIndex(-1);
  }, []);

  // Position panel on desktop
  useEffect(() => {
    if (!open || isMobile) {
      return;
    }
    updatePanelPosition();
    window.addEventListener('scroll', updatePanelPosition, true);
    window.addEventListener('resize', updatePanelPosition);
    return () => {
      window.removeEventListener('scroll', updatePanelPosition, true);
      window.removeEventListener('resize', updatePanelPosition);
    };
  }, [open, isMobile, updatePanelPosition]);

  // Focus search input when opening
  useEffect(() => {
    if (open && searchable) {
      // Delay to allow render
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }, [open, searchable]);

  // Click outside handler
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      handleClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, handleClose]);

  // Escape handler
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, handleClose]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!open || highlightedIndex < 0) {
      return;
    }
    const listEl = listRef.current;
    if (!listEl) {
      return;
    }
    const items = listEl.querySelectorAll<HTMLElement>('[data-select-option]');
    const item = items[highlightedIndex];
    if (item && typeof item.scrollIntoView === 'function') {
      item.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleOpen();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          setHighlightedIndex((prev) => {
            const next = prev + 1;
            return next >= flatFiltered.length ? 0 : next;
          });
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          setHighlightedIndex((prev) => {
            const next = prev - 1;
            return next < 0 ? flatFiltered.length - 1 : next;
          });
          break;
        }
        case 'Home': {
          e.preventDefault();
          setHighlightedIndex(0);
          break;
        }
        case 'End': {
          e.preventDefault();
          setHighlightedIndex(flatFiltered.length - 1);
          break;
        }
        case 'Enter': {
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < flatFiltered.length) {
            handleSelect(flatFiltered[highlightedIndex].value);
          }
          break;
        }
        case 'Tab': {
          e.preventDefault();
          break;
        }
      }
    },
    [open, flatFiltered, highlightedIndex, handleOpen, handleSelect],
  );

  const handleTriggerClick = useCallback(() => {
    if (open) {
      handleClose();
    } else {
      handleOpen();
    }
  }, [open, handleOpen, handleClose]);

  const renderOptionList = (mobileMode: boolean) => {
    const optionSize = mobileMode ? 'px-4 py-3 text-base min-h-[44px]' : s.option;

    if (filteredOptions.length === 0) {
      return (
        <div className={['text-text-muted text-center py-6', mobileMode ? 'text-base' : 'text-sm'].join(' ')}>
          No options found
        </div>
      );
    }

    let flatIndex = 0;

    return groupedOptions.map((group) => (
      <div key={group.key ?? '__ungrouped'} role="group" aria-label={group.label ?? undefined}>
        {group.label && (
          <div
            className={[
              'px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-text-tertiary',
              'select-none',
              mobileMode ? 'px-4 pt-3 pb-1.5' : '',
            ].filter(Boolean).join(' ')}
            role="presentation"
          >
            {group.label}
          </div>
        )}
        {group.options.map((option) => {
          const isDisabled = !!option.disabled;
          const isSelected = option.value === currentValue;
          // Only count enabled items in flatIndex
          const thisIndex = isDisabled ? -1 : flatFiltered.indexOf(option);
          const isHighlighted = thisIndex >= 0 && thisIndex === highlightedIndex;
          if (!isDisabled) {
            flatIndex++;
          }

          return (
            <div
              key={option.value}
              data-select-option=""
              role="option"
              aria-selected={isSelected}
              aria-disabled={isDisabled || undefined}
              id={`${listboxId}-option-${option.value}`}
              className={[
                'flex items-center justify-between gap-2 cursor-pointer transition-colors duration-100',
                optionSize,
                isDisabled ? 'opacity-40 cursor-not-allowed' : '',
                isHighlighted && !isDisabled
                  ? 'bg-primary/10 text-text-strong'
                  : '',
                isSelected && !isHighlighted
                  ? 'text-text-strong font-medium'
                  : '',
                !isSelected && !isHighlighted && !isDisabled
                  ? 'text-text hover:bg-surface-lighter'
                  : '',
              ].filter(Boolean).join(' ')}
              onMouseEnter={() => {
                if (!isDisabled && thisIndex >= 0) {
                  setHighlightedIndex(thisIndex);
                }
              }}
              onMouseDown={(e) => {
                // Prevent blur of search input
                e.preventDefault();
              }}
              onClick={() => {
                if (!isDisabled) {
                  handleSelect(option.value);
                }
              }}
            >
              <span className="truncate">{option.label}</span>
              {isSelected && (
                <svg
                  className={['shrink-0 text-primary', mobileMode ? 'w-5 h-5' : s.icon].join(' ')}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    ));
  };

  const triggerContent = selectedOption ? (
    <span className="truncate text-text">{selectedOption.label}</span>
  ) : (
    <span className="truncate text-text-muted">{placeholder}</span>
  );

  const activeDescendant =
    open && highlightedIndex >= 0 && highlightedIndex < flatFiltered.length
      ? `${listboxId}-option-${flatFiltered[highlightedIndex].value}`
      : undefined;

  if (isMobile && open) {
    return (
      <div ref={containerRef} className={['w-full', className].filter(Boolean).join(' ')}>
        {/* Hidden native input for form compat */}
        <input ref={ref} type="hidden" name={name} value={currentValue ?? ''} {...rest} />

        {label && (
          <label htmlFor={inputId} className={['block font-medium text-text-secondary mb-1.5', s.label].join(' ')}>
            {label}
          </label>
        )}
        {description && <p className="text-xs text-text-tertiary mb-1.5">{description}</p>}

        <button
          ref={triggerRef}
          type="button"
          id={inputId}
          disabled={disabled}
          className={[
            'w-full flex items-center justify-between gap-2 border bg-surface text-left outline-none transition-all duration-200',
            s.trigger,
            hasError
              ? 'border-danger ring-2 ring-danger/30'
              : 'border-primary ring-2 ring-primary/50',
            disabled ? 'opacity-50 cursor-not-allowed bg-surface-lighter' : '',
          ].filter(Boolean).join(' ')}
          aria-haspopup="listbox"
          aria-expanded={true}
          aria-controls={listboxId}
          aria-activedescendant={activeDescendant}
          onClick={handleClose}
          onKeyDown={handleKeyDown}
        >
          {triggerContent}
          <ChevronIcon className={s.icon} open={true} />
        </button>
        {error && <p id={`${inputId}-error`} className="mt-1.5 text-xs text-danger">{error}</p>}

        {/* Bottom sheet overlay */}
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={handleClose}
          aria-hidden="true"
          style={{ animation: 'select-backdrop-in 150ms ease-out both' }}
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-label={typeof label === 'string' ? label : 'Select option'}
          className={[
            'fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-surface',
            'shadow-[0_-8px_40px_-8px_rgba(0,0,0,0.2)]',
            'max-h-[70vh] flex flex-col',
          ].join(' ')}
          style={{
            animation: 'select-sheet-in 250ms cubic-bezier(0.16, 1, 0.3, 1) both',
            paddingBottom: 'env(safe-area-inset-bottom, 20px)',
          }}
          onKeyDown={handleKeyDown}
        >
          <div className="mx-auto mt-3 mb-2 h-1 w-10 rounded-full bg-surface-border shrink-0" aria-hidden="true" />
          {searchable && (
            <div className="px-4 pb-2 shrink-0">
              <input
                ref={searchInputRef}
                type="text"
                className={[
                  'w-full h-10 px-3.5 text-sm rounded-xl border bg-surface text-text outline-none',
                  'border-input-border focus:ring-2 focus:ring-primary/50 focus:border-primary',
                  'placeholder:text-text-muted transition-all duration-200',
                ].join(' ')}
                placeholder="Search..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setHighlightedIndex(0);
                }}
                aria-label="Search options"
                aria-controls={listboxId}
              />
            </div>
          )}
          <div
            ref={listRef}
            role="listbox"
            id={listboxId}
            aria-label={typeof label === 'string' ? label : 'Options'}
            className="overflow-y-auto flex-1 overscroll-contain pb-2"
          >
            {renderOptionList(true)}
          </div>
        </div>
        <style>{selectKeyframes}</style>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={['w-full', className].filter(Boolean).join(' ')}>
      {/* Hidden native input for form compat */}
      <input ref={ref} type="hidden" name={name} value={currentValue ?? ''} {...rest} />

      {label && (
        <label htmlFor={inputId} className={['block font-medium text-text-secondary mb-1.5', s.label].join(' ')}>
          {label}
        </label>
      )}
      {description && <p className="text-xs text-text-tertiary mb-1.5">{description}</p>}

      <button
        ref={triggerRef}
        type="button"
        id={inputId}
        disabled={disabled}
        className={[
          'w-full flex items-center justify-between gap-2 border bg-surface text-left outline-none transition-all duration-200',
          s.trigger,
          hasError
            ? 'border-danger focus:ring-2 focus:ring-danger/30 focus:border-danger'
            : 'border-input-border focus:ring-2 focus:ring-primary/50 focus:border-primary',
          disabled ? 'opacity-50 cursor-not-allowed bg-surface-lighter' : '',
        ].filter(Boolean).join(' ')}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={activeDescendant}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? `${inputId}-error` : undefined}
        onClick={handleTriggerClick}
        onKeyDown={handleKeyDown}
      >
        <span className="flex-1 flex items-center gap-2 min-w-0">
          {triggerContent}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {clearable && currentValue && !disabled && (
            <span
              role="button"
              className={[
                'rounded-md p-0.5 text-text-muted hover:text-text-secondary',
                'hover:bg-surface-lighter transition-colors duration-100',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                'cursor-pointer',
              ].join(' ')}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClear(e as unknown as React.MouseEvent);
                }
              }}
              aria-label="Clear selection"
              tabIndex={-1}
            >
              <svg className={s.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
          )}
          <ChevronIcon className={s.icon} open={open} />
        </span>
      </button>

      {error && <p id={`${inputId}-error`} className="mt-1.5 text-xs text-danger">{error}</p>}

      {open && !isMobile && (
        <div
          ref={panelRef}
          className={[
            'fixed z-50 rounded-xl bg-surface overflow-hidden',
            'shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.05)]',
            'ring-1 ring-surface-border/50',
            'flex flex-col',
          ].join(' ')}
          style={{
            top: panelPosition.top,
            left: panelPosition.left,
            width: panelPosition.width,
            maxHeight: 300,
            animation: 'select-panel-in 200ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
          }}
        >
          {searchable && (
            <div className="p-2 border-b border-surface-border shrink-0">
              <input
                ref={searchInputRef}
                type="text"
                className={[
                  'w-full h-8 px-3 text-xs rounded-lg border bg-surface text-text outline-none',
                  'border-input-border focus:ring-2 focus:ring-primary/50 focus:border-primary',
                  'placeholder:text-text-muted transition-all duration-200',
                ].join(' ')}
                placeholder="Search..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setHighlightedIndex(0);
                }}
                aria-label="Search options"
                aria-controls={listboxId}
                onKeyDown={handleKeyDown}
              />
            </div>
          )}
          <div
            ref={listRef}
            role="listbox"
            id={listboxId}
            aria-label={typeof label === 'string' ? label : 'Options'}
            className="overflow-y-auto overscroll-contain py-1"
          >
            {renderOptionList(false)}
          </div>
        </div>
      )}
      <style>{selectKeyframes}</style>
    </div>
  );
});

Select.displayName = 'Select';

function ChevronIcon({ className, open }: { className: string; open: boolean }) {
  return (
    <svg
      className={[
        className,
        'text-text-muted transition-transform duration-200',
        open ? 'rotate-180' : '',
      ].join(' ')}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

const selectKeyframes = `
  @keyframes select-panel-in {
    from { opacity: 0; transform: scale(0.97) translateY(-4px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes select-backdrop-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes select-sheet-in {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
`;
