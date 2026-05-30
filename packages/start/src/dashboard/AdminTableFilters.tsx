import { useEffect, useState } from 'react';

type AdminFilterConfig = {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date_range' | 'boolean';
  options?: Array<{ value: string; label: string }>;
};

interface AdminTableFiltersProps {
  filters: AdminFilterConfig[];
  activeFilters: Record<string, unknown>;
  onFilterChange: (key: string, value: unknown) => void;
  onClear: () => void;
  search: string;
  onSearch: (value: string) => void;
}

export const AdminTableFilters: React.FC<AdminTableFiltersProps> = ({
  filters,
  activeFilters,
  onFilterChange,
  onClear,
  search,
  onSearch,
}) => {
  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    const t = setTimeout(() => onSearch(localSearch), 300);
    return () => clearTimeout(t);
  }, [localSearch]);

  const hasActiveFilters = Object.values(activeFilters).some((v) => v !== undefined && v !== '' && v !== null);

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 border-b border-slate-200 bg-white">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <input
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Search…"
          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
        />
        <svg
          className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {filters.map((f) => {
        if (f.type === 'boolean') {
          return (
            <label key={f.key} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={!!activeFilters[f.key]}
                onChange={(e) => onFilterChange(f.key, e.target.checked || undefined)}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              {f.label}
            </label>
          );
        }
        if (f.type === 'select' && f.options) {
          return (
            <select
              key={f.key}
              value={String(activeFilters[f.key] ?? '')}
              onChange={(e) => onFilterChange(f.key, e.target.value || undefined)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">{f.label}</option>
              {f.options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          );
        }
        return (
          <input
            key={f.key}
            type="text"
            placeholder={f.label}
            value={String(activeFilters[f.key] ?? '')}
            onChange={(e) => onFilterChange(f.key, e.target.value || undefined)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 min-w-[140px]"
          />
        );
      })}

      {hasActiveFilters && (
        <button
          onClick={onClear}
          className="text-sm text-slate-500 hover:text-slate-800 underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
};
