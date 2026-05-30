import React, { useEffect, useRef, useState } from 'react';

export type FilterOption = {
  value: string;
  label: string;
  dot?: string;
};

type FilterPillProps = {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
};

const FilterPill: React.FC<FilterPillProps> = ({ label, options, selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const active = selected.length > 0;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
          border transition-colors
          ${active
            ? 'bg-primary-subtle border-primary-light text-primary'
            : 'bg-surface border-surface-border text-text hover:border-primary-light/40 hover:text-text-strong'}
        `}
      >
        {label}
        {active && (
          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold">
            {selected.length}
          </span>
        )}
        <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 bg-surface rounded-lg shadow-lg border border-surface-border py-1 min-w-[160px]">
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2.5 px-3 py-2 hover:bg-surface-lighter cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                className="rounded border-surface-border text-primary focus:ring-indigo-500"
              />
              {opt.dot && (
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: opt.dot }}
                />
              )}
              <span className="text-sm text-text">{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export { FilterPill };
