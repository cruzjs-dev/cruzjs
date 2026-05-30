import React, { useEffect, useRef, useState } from 'react';

export type InlineSelectOption = {
  value: string;
  label: string;
  color?: string;
};

type InlineSelectProps = {
  value: string;
  options: InlineSelectOption[];
  onChange: (value: string) => void;
  chipClass?: string;
  disabled?: boolean;
};

const InlineSelect: React.FC<InlineSelectProps> = ({
  value,
  options,
  onChange,
  chipClass,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = options.find((o) => o.value === value);

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

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={`
          inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
          border transition-colors
          ${disabled ? 'cursor-default opacity-70' : 'cursor-pointer hover:opacity-80'}
          ${chipClass ?? 'bg-surface-light border-surface-border text-text'}
        `}
      >
        {current?.color && (
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: current.color }}
          />
        )}
        {current?.label ?? value}
        {!disabled && (
          <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-surface rounded-lg shadow-lg border border-surface-border py-1 min-w-[140px]">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelect(opt.value)}
              className={`
                w-full flex items-center gap-2 px-3 py-2 text-sm text-left
                hover:bg-surface-lighter transition-colors
                ${opt.value === value ? 'text-primary font-medium' : 'text-text'}
              `}
            >
              {opt.color && (
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: opt.color }}
                />
              )}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export { InlineSelect };
