import React, { forwardRef, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

export type ComboboxOption = {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
};

export type ComboboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'onChange' | 'value'> & {
  label?: React.ReactNode;
  description?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  options: ComboboxOption[];
  value?: string | string[];
  defaultValue?: string | string[];
  onChange?: (value: string | string[] | undefined) => void;
  placeholder?: string;
  multiple?: boolean;
  creatable?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  maxSelections?: number;
  noResultsMessage?: string;
};

type SizeConfig = { input: string; label: string; pill: string; pillText: string; icon: string };

const sizeStyles: Record<'sm' | 'md' | 'lg', SizeConfig> = {
  sm: {
    input: 'min-h-8 px-3 text-xs rounded-lg',
    label: 'text-xs',
    pill: 'h-5 px-1.5 text-[10px] rounded-md gap-0.5',
    pillText: 'max-w-[100px]',
    icon: 'w-3.5 h-3.5',
  },
  md: {
    input: 'min-h-10 px-3.5 text-sm rounded-xl',
    label: 'text-sm',
    pill: 'h-6 px-2 text-xs rounded-lg gap-1',
    pillText: 'max-w-[120px]',
    icon: 'w-4 h-4',
  },
  lg: {
    input: 'min-h-12 px-4 text-base rounded-xl',
    label: 'text-sm',
    pill: 'h-7 px-2.5 text-sm rounded-lg gap-1',
    pillText: 'max-w-[140px]',
    icon: 'w-5 h-5',
  },
};

export const Combobox = forwardRef<HTMLInputElement, ComboboxProps>(function Combobox(
  {
    label,
    description,
    error,
    size = 'md',
    options,
    value: controlledValue,
    defaultValue,
    onChange,
    placeholder,
    multiple = false,
    creatable = false,
    clearable = false,
    disabled = false,
    maxSelections,
    noResultsMessage = 'No results found',
    className,
    id,
    ...rest
  },
  ref,
) {
  const isMobile = useIsMobile();
  const generatedId = useId();
  const inputId = id ?? `combobox-${generatedId}`;
  const listboxId = `${inputId}-listbox`;
  const s = sizeStyles[size];
  const hasError = !!error;

  // ── State ──────────────────────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [internalValue, setInternalValue] = useState<string[]>(() => {
    const init = defaultValue ?? [];
    return Array.isArray(init) ? init : [init];
  });

  const isControlled = controlledValue !== undefined;
  const selectedValues: string[] = useMemo(() => {
    if (!isControlled) {
      return internalValue;
    }
    const v = controlledValue;
    return Array.isArray(v) ? v : v ? [v] : [];
  }, [isControlled, controlledValue, internalValue]);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const optionRefs = useRef<Map<number, HTMLLIElement>>(new Map());

  // Merge external ref
  const setInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
      }
    },
    [ref],
  );

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filteredOptions = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      return options;
    }
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const showCreatable = useMemo(() => {
    if (!creatable || !query.trim()) {
      return false;
    }
    return !options.some((o) => o.label.toLowerCase() === query.toLowerCase().trim());
  }, [creatable, query, options]);

  const flatItems = useMemo(() => {
    const items: Array<ComboboxOption & { isCreate?: boolean }> = [...filteredOptions];
    if (showCreatable) {
      items.push({ value: query.trim(), label: query.trim(), isCreate: true });
    }
    return items;
  }, [filteredOptions, showCreatable, query]);

  // ── Groups ─────────────────────────────────────────────────────────────────
  const groupedItems = useMemo(() => {
    const groups: Array<{ group: string | null; items: typeof flatItems }> = [];
    const seen = new Set<string | null>();

    for (const item of flatItems) {
      const g = item.group ?? null;
      if (!seen.has(g)) {
        seen.add(g);
        groups.push({ group: g, items: [] });
      }
      groups.find((gr) => gr.group === g)!.items.push(item);
    }
    return groups;
  }, [flatItems]);

  // ── Selection ──────────────────────────────────────────────────────────────
  const isSelected = useCallback(
    (val: string) => selectedValues.includes(val),
    [selectedValues],
  );

  const limitReached = !!maxSelections && selectedValues.length >= maxSelections;

  const emitChange = useCallback(
    (next: string[]) => {
      if (!isControlled) {
        setInternalValue(next);
      }
      if (onChange) {
        if (multiple) {
          onChange(next);
        } else {
          onChange(next[0]);
        }
      }
    },
    [isControlled, multiple, onChange],
  );

  const selectOption = useCallback(
    (val: string) => {
      if (multiple) {
        if (isSelected(val)) {
          emitChange(selectedValues.filter((v) => v !== val));
        } else if (!limitReached) {
          emitChange([...selectedValues, val]);
        }
        setQuery('');
        inputRef.current?.focus();
      } else {
        emitChange([val]);
        setQuery('');
        setOpen(false);
        inputRef.current?.focus();
      }
    },
    [multiple, isSelected, selectedValues, emitChange, limitReached],
  );

  const removeValue = useCallback(
    (val: string) => {
      emitChange(selectedValues.filter((v) => v !== val));
      inputRef.current?.focus();
    },
    [selectedValues, emitChange],
  );

  const clearAll = useCallback(() => {
    emitChange([]);
    setQuery('');
    inputRef.current?.focus();
  }, [emitChange]);

  // ── Keyboard ───────────────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) {
        return;
      }

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          if (!open) {
            setOpen(true);
            setActiveIndex(0);
            return;
          }
          setActiveIndex((prev) => {
            let next = prev + 1;
            // Skip disabled items
            while (next < flatItems.length && flatItems[next].disabled) {
              next++;
            }
            return next >= flatItems.length ? prev : next;
          });
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          if (!open) {
            return;
          }
          setActiveIndex((prev) => {
            let next = prev - 1;
            while (next >= 0 && flatItems[next].disabled) {
              next--;
            }
            return next < 0 ? prev : next;
          });
          break;
        }
        case 'Enter': {
          e.preventDefault();
          if (open && activeIndex >= 0 && activeIndex < flatItems.length) {
            const item = flatItems[activeIndex];
            if (!item.disabled) {
              selectOption(item.value);
            }
          } else if (!open) {
            setOpen(true);
          }
          break;
        }
        case 'Escape': {
          e.preventDefault();
          if (open) {
            setOpen(false);
            setActiveIndex(-1);
          }
          break;
        }
        case 'Backspace': {
          if (multiple && query === '' && selectedValues.length > 0) {
            removeValue(selectedValues[selectedValues.length - 1]);
          }
          break;
        }
      }
    },
    [disabled, open, activeIndex, flatItems, selectOption, multiple, query, selectedValues, removeValue],
  );

  // ── Click outside ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
      setActiveIndex(-1);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // ── Scroll active option into view ─────────────────────────────────────────
  useEffect(() => {
    if (activeIndex < 0) {
      return;
    }
    const el = optionRefs.current.get(activeIndex);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  // ── Reset activeIndex on filter change ────────────────────────────────────
  useEffect(() => {
    setActiveIndex(flatItems.length > 0 ? 0 : -1);
  }, [flatItems.length, query]);

  // ── Derive display for single-select ───────────────────────────────────────
  const singleDisplayLabel = useMemo(() => {
    if (multiple || selectedValues.length === 0) {
      return '';
    }
    const opt = options.find((o) => o.value === selectedValues[0]);
    return opt?.label ?? selectedValues[0];
  }, [multiple, selectedValues, options]);

  // ── Render helpers ─────────────────────────────────────────────────────────
  const inputDisplayValue = (() => {
    if (open) {
      return query;
    }
    if (!multiple && selectedValues.length > 0) {
      return singleDisplayLabel;
    }
    return query;
  })();

  const selectedPills = multiple
    ? selectedValues.map((val) => {
      const opt = options.find((o) => o.value === val);
      return { value: val, label: opt?.label ?? val };
    })
    : [];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (!open) {
      setOpen(true);
    }
  };

  const handleInputFocus = () => {
    if (!disabled) {
      setOpen(true);
      if (!multiple && selectedValues.length > 0) {
        setQuery('');
      }
    }
  };

  const handleInputClick = () => {
    if (!disabled && !open) {
      setOpen(true);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const renderOptionList = (inSheet = false) => {
    let globalIndex = 0;

    return (
      <ul
        ref={listRef}
        id={listboxId}
        role="listbox"
        aria-multiselectable={multiple || undefined}
        className={[
          'overflow-y-auto overscroll-contain',
          inSheet ? 'max-h-[60vh]' : 'max-h-60',
        ].join(' ')}
      >
        {flatItems.length === 0 && !showCreatable && (
          <li className="px-3 py-3 text-center text-text-tertiary" role="option" aria-disabled="true" aria-selected={false}>
            {noResultsMessage}
          </li>
        )}
        {groupedItems.map(({ group, items }) => (
          <React.Fragment key={group ?? '__ungrouped__'}>
            {group && (
              <li
                className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-text-muted select-none"
                role="presentation"
              >
                {group}
              </li>
            )}
            {items.map((item) => {
              const idx = globalIndex++;
              const isActive = idx === activeIndex;
              const selected = isSelected(item.value);
              const isDisabledOption = item.disabled || (!selected && limitReached);
              const isCreateItem = 'isCreate' in item && item.isCreate;

              return (
                <li
                  key={isCreateItem ? `__create__${item.value}` : item.value}
                  ref={(node) => {
                    if (node) {
                      optionRefs.current.set(idx, node);
                    } else {
                      optionRefs.current.delete(idx);
                    }
                  }}
                  id={`${inputId}-option-${idx}`}
                  role="option"
                  aria-selected={selected}
                  aria-disabled={isDisabledOption || undefined}
                  data-active={isActive || undefined}
                  className={[
                    'flex items-center gap-2 px-3 py-2 cursor-pointer select-none transition-colors duration-100',
                    size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm',
                    isActive
                      ? 'shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
                      : '',
                    isDisabledOption
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:bg-surface-lighter',
                  ].filter(Boolean).join(' ')}
                  style={
                    isActive
                      ? { backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))' }
                      : undefined
                  }
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (!isDisabledOption) {
                      selectOption(item.value);
                    }
                  }}
                  onMouseEnter={() => {
                    if (!isDisabledOption) {
                      setActiveIndex(idx);
                    }
                  }}
                >
                  {isCreateItem ? (
                    <span className="flex items-center gap-1.5 text-primary font-medium">
                      <PlusIcon className={s.icon} />
                      Create &ldquo;{item.label}&rdquo;
                    </span>
                  ) : (
                    <>
                      <span className="flex-1 truncate">{item.label}</span>
                      {selected && <CheckIcon className={s.icon} />}
                    </>
                  )}
                </li>
              );
            })}
          </React.Fragment>
        ))}
      </ul>
    );
  };

  const showClearButton = clearable && selectedValues.length > 0 && !disabled;

  const triggerContent = (
    <div
      className={['w-full', className].filter(Boolean).join(' ')}
    >
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
      <div
        className={[
          'relative flex flex-wrap items-center gap-1 w-full border bg-surface text-text transition-all duration-200',
          s.input,
          hasError
            ? 'border-danger focus-within:ring-2 focus-within:ring-danger/30 focus-within:border-danger'
            : 'border-input-border focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary',
          disabled ? 'opacity-50 cursor-not-allowed bg-surface-lighter' : 'cursor-text',
          // Extra padding for icons on the right side
          showClearButton ? 'pr-14' : 'pr-8',
        ].filter(Boolean).join(' ')}
        onClick={() => {
          if (!disabled) {
            inputRef.current?.focus();
          }
        }}
      >
        {selectedPills.map((pill) => (
          <span
            key={pill.value}
            className={[
              'inline-flex items-center font-medium ring-1 ring-primary/20',
              s.pill,
            ].join(' ')}
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-primary) 8%, var(--color-surface))',
              color: 'var(--color-primary)',
            }}
          >
            <span className={['truncate', s.pillText].join(' ')}>{pill.label}</span>
            <button
              type="button"
              tabIndex={-1}
              aria-label={`Remove ${pill.label}`}
              className="shrink-0 rounded-sm hover:bg-primary/20 transition-colors duration-100 p-px"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                removeValue(pill.value);
              }}
            >
              <XIcon className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
            </button>
          </span>
        ))}
        <input
          ref={setInputRef}
          id={inputId}
          type="text"
          role="combobox"
          disabled={disabled}
          aria-expanded={open}
          aria-controls={listboxId}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `${inputId}-option-${activeIndex}` : undefined}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? `${inputId}-error` : undefined}
          className={[
            'flex-1 min-w-[60px] bg-transparent outline-none placeholder:text-text-muted',
            size === 'sm' ? 'text-xs py-0.5' : size === 'lg' ? 'text-base py-1' : 'text-sm py-0.5',
            disabled ? 'cursor-not-allowed' : '',
          ].filter(Boolean).join(' ')}
          placeholder={selectedPills.length > 0 ? '' : placeholder}
          value={inputDisplayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onClick={handleInputClick}
          onKeyDown={handleKeyDown}
          {...rest}
        />
        {/* Right-side icons */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {showClearButton && (
            <button
              type="button"
              tabIndex={-1}
              aria-label="Clear selection"
              className="rounded-md p-0.5 text-text-muted hover:text-text-secondary hover:bg-surface-lighter transition-colors duration-100"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                clearAll();
              }}
            >
              <XIcon className={s.icon} />
            </button>
          )}
          <span className="text-text-muted pointer-events-none">
            <ChevronDownIcon className={[s.icon, 'transition-transform duration-200', open ? 'rotate-180' : ''].join(' ')} />
          </span>
        </div>
      </div>
      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs text-danger">{error}</p>
      )}
    </div>
  );

  // ── Mobile bottom sheet ────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div ref={containerRef}>
        {triggerContent}
        {open && (
          <div
            className="fixed inset-0 z-50 flex flex-col justify-end"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setOpen(false);
                setActiveIndex(-1);
              }
            }}
          >
            <div
              className="fixed inset-0 bg-black/40"
              style={{ animation: 'combobox-backdrop-in 150ms ease-out both' }}
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label={typeof label === 'string' ? label : 'Combobox'}
              className={[
                'relative z-10 flex w-full flex-col rounded-t-2xl bg-surface',
                'shadow-[0_-8px_40px_-8px_rgba(0,0,0,0.2)]',
                'max-h-[85vh]',
              ].join(' ')}
              style={{
                animation: 'combobox-sheet-in 300ms cubic-bezier(0.16, 1, 0.3, 1) both',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              }}
            >
              <div className="mx-auto mt-3 mb-2 h-1 w-10 rounded-full bg-surface-border shrink-0" aria-hidden="true" />
              <div className="px-4 pb-3">
                <input
                  type="text"
                  className="w-full rounded-xl border border-input-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary placeholder:text-text-muted transition-shadow"
                  placeholder="Search..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex-1 overflow-hidden">
                {renderOptionList(true)}
              </div>
            </div>
          </div>
        )}
        <style>{comboboxKeyframes}</style>
      </div>
    );
  }

  // ── Desktop dropdown ───────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative">
      {triggerContent}
      {open && (
        <div
          className={[
            'absolute z-50 mt-1 w-full rounded-xl bg-surface py-1',
            'shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.05)]',
            'ring-1 ring-surface-border/50',
          ].join(' ')}
          style={{
            animation: 'combobox-dropdown-in 200ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
          }}
        >
          {renderOptionList(false)}
        </div>
      )}
      <style>{comboboxKeyframes}</style>
    </div>
  );
});

Combobox.displayName = 'Combobox';

// ── Icons ────────────────────────────────────────────────────────────────────

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

// ── Keyframes ────────────────────────────────────────────────────────────────

const comboboxKeyframes = `
  @keyframes combobox-dropdown-in {
    from { opacity: 0; transform: scale(0.95) translateY(-4px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes combobox-backdrop-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes combobox-sheet-in {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
`;
