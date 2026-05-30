import React, { useState, useRef, useEffect } from 'react';

// Types
export type FilterOption = {
  value: string;
  label: string;
  count?: number;
};

export type FilterConfig = {
  id: string;
  label: string;
  placeholder?: string;
  options: FilterOption[];
  value?: string;
  onChange: (value: string | undefined) => void;
};

export type QuickStat = {
  label: string;
  count: number;
  color: 'slate' | 'emerald' | 'red' | 'amber' | 'blue' | 'violet';
};

export type SearchFilterBarProps = {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  quickStats?: QuickStat[];
  className?: string;
  showFilterIcon?: boolean;
  children?: React.ReactNode;
};

const statColors: Record<QuickStat['color'], { dot: string; text: string }> = {
  slate: { dot: 'var(--color-text-muted)', text: 'var(--color-text-secondary)' },
  emerald: { dot: 'var(--color-success)', text: 'var(--color-success-text)' },
  red: { dot: 'var(--color-danger)', text: 'var(--color-danger-text)' },
  amber: { dot: 'var(--color-warning)', text: 'var(--color-warning-text)' },
  blue: { dot: 'var(--color-primary)', text: 'var(--color-primary-dark)' },
  violet: { dot: 'var(--color-primary-lighter)', text: 'var(--color-primary-dark)' },
};

const FilterDropdown: React.FC<{ config: FilterConfig }> = ({ config }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = config.options.find((opt) => opt.value === config.value);
  const hasValue = config.value !== undefined && config.value !== '';
  const displayText = selectedOption?.label || config.placeholder || config.label;

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          fontSize: '14px',
          fontWeight: 500,
          borderRadius: '8px',
          border: hasValue ? '1px solid var(--color-primary-lighter)' : '1px solid var(--color-surface-border)',
          backgroundColor: hasValue ? 'var(--color-primary-subtle)' : 'var(--color-surface)',
          color: hasValue ? 'var(--color-primary-dark)' : 'var(--color-text)',
          cursor: 'pointer',
          transition: 'all 150ms ease',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => {
          if (!hasValue) {
            e.currentTarget.style.backgroundColor = 'var(--color-surface-light)';
            e.currentTarget.style.borderColor = 'var(--color-input-border)';
          }
        }}
        onMouseLeave={(e) => {
          if (!hasValue) {
            e.currentTarget.style.backgroundColor = 'var(--color-surface)';
            e.currentTarget.style.borderColor = 'var(--color-surface-border)';
          }
        }}
      >
        <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {displayText}
        </span>
        {selectedOption?.count !== undefined && (
          <span
            style={{
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: '9999px',
              backgroundColor: hasValue ? 'var(--color-primary-subtle)' : 'var(--color-surface-lighter)',
              color: hasValue ? 'var(--color-primary-dark)' : 'var(--color-text-tertiary)',
            }}
          >
            {selectedOption.count}
          </span>
        )}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 150ms ease',
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            minWidth: '220px',
            maxHeight: '300px',
            overflowY: 'auto',
            backgroundColor: 'var(--color-surface)',
            borderRadius: '10px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)',
            zIndex: 50,
            padding: '4px',
          }}
        >
          {hasValue && (
            <button
              type="button"
              onClick={() => {
                config.onChange(undefined);
                setIsOpen(false);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                fontSize: '13px',
                color: 'var(--color-text-tertiary)',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--color-surface-lighter)',
                borderRadius: '6px 6px 0 0',
                cursor: 'pointer',
                textAlign: 'left',
                marginBottom: '4px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-light)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
              Clear filter
            </button>
          )}

          {config.options.map((option) => {
            const isSelected = option.value === config.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  config.onChange(option.value);
                  setIsOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  fontSize: '14px',
                  color: isSelected ? 'var(--color-primary-dark)' : 'var(--color-text)',
                  backgroundColor: isSelected ? 'var(--color-primary-subtle)' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 100ms ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--color-surface-light)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isSelected && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                  {option.label}
                </span>
                {option.count !== undefined && (
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      backgroundColor: isSelected ? 'var(--color-primary-subtle)' : 'var(--color-surface-lighter)',
                      color: isSelected ? 'var(--color-primary-dark)' : 'var(--color-text-tertiary)',
                      fontWeight: 500,
                    }}
                  >
                    {option.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const SearchInput: React.FC<{
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}> = ({ value = '', onChange, placeholder = 'Search...' }) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      style={{
        position: 'relative',
        flex: '1 1 auto',
        minWidth: '200px',
        maxWidth: '320px',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: isFocused ? 'var(--color-primary)' : 'var(--color-text-muted)',
          pointerEvents: 'none',
          transition: 'color 150ms ease',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '10px 36px 10px 42px',
          fontSize: '14px',
          color: 'var(--color-text)',
          backgroundColor: isFocused ? 'var(--color-surface)' : 'var(--color-surface-light)',
          border: isFocused ? '1px solid var(--color-primary)' : '1px solid var(--color-surface-border)',
          borderRadius: '10px',
          outline: 'none',
          boxShadow: isFocused ? '0 0 0 3px color-mix(in srgb, var(--color-primary) 10%, transparent)' : 'none',
          transition: 'all 150ms ease',
        }}
      />

      {value && (
        <button
          type="button"
          onClick={() => onChange?.('')}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            padding: '4px',
            color: 'var(--color-text-muted)',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

const QuickStats: React.FC<{ stats: QuickStat[] }> = ({ stats }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
    {stats.map((stat, index) => {
      const colors = statColors[stat.color];
      return (
        <div
          key={index}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: colors.dot,
            }}
          />
          <span style={{ color: colors.text }}>
            {stat.count.toLocaleString()} {stat.label}
          </span>
        </div>
      );
    })}
  </div>
);

const ActiveFilters: React.FC<{ filters: FilterConfig[] }> = ({ filters }) => {
  const activeFilters = filters.filter((f) => f.value !== undefined && f.value !== '');
  if (activeFilters.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        paddingTop: '12px',
        marginTop: '12px',
        borderTop: '1px solid var(--color-surface-lighter)',
      }}
    >
      <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>
        Active:
      </span>
      {activeFilters.map((filter) => {
        const option = filter.options.find((o) => o.value === filter.value);
        return (
          <button
            key={filter.id}
            type="button"
            onClick={() => filter.onChange(undefined)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--color-primary-dark)',
              backgroundColor: 'var(--color-primary-subtle)',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 100ms ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-lighter)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-primary-subtle)')}
          >
            <span>{filter.label}: {option?.label}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        );
      })}
    </div>
  );
};

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  quickStats,
  className = '',
  showFilterIcon = false,
  children,
}) => {
  const hasActiveFilters = filters.some((f) => f.value !== undefined && f.value !== '');

  return (
    <div
      className={className}
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-surface-border)',
        borderRadius: '14px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
        }}
      >
        {showFilterIcon && (
          <div
            style={{
              padding: '10px',
              borderRadius: '10px',
              backgroundColor: hasActiveFilters ? 'var(--color-primary-subtle)' : 'var(--color-surface-light)',
              color: hasActiveFilters ? 'var(--color-primary)' : 'var(--color-text-muted)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
            </svg>
          </div>
        )}

        {onSearchChange && (
          <SearchInput
            value={searchValue}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
          />
        )}

        {onSearchChange && filters.length > 0 && (
          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--color-surface-border)' }} />
        )}

        {filters.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {filters.map((filter) => (
              <FilterDropdown key={filter.id} config={filter} />
            ))}
          </div>
        )}

        {children}

        <div style={{ flex: 1 }} />

        {quickStats && quickStats.length > 0 && <QuickStats stats={quickStats} />}
      </div>

      {filters.length > 0 && hasActiveFilters && (
        <div style={{ padding: '0 16px 16px' }}>
          <ActiveFilters filters={filters} />
        </div>
      )}
    </div>
  );
};

export default SearchFilterBar;
