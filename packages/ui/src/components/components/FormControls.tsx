import React from 'react';

// Icons
const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

// Input Component
type InputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'search';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
};

const Input: React.FC<InputProps> = ({
  value,
  onChange,
  placeholder,
  type = 'text',
  size = 'md',
  icon,
  className = '',
  disabled = false,
}) => {
  const sizeClasses = size === 'sm'
    ? 'py-1.5 text-sm'
    : 'py-2 text-sm';

  const showSearchIcon = type === 'search' && !icon;

  return (
    <div className={`relative ${className}`}>
      {(icon || showSearchIcon) && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
          {icon || <SearchIcon />}
        </div>
      )}
      <input
        type={type === 'search' ? 'text' : type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`
          w-full rounded-md
          placeholder-text-muted
          focus:outline-none focus:ring-2 focus:ring-primary/30
          disabled:cursor-not-allowed
          transition-colors
          ${sizeClasses}
          ${(icon || showSearchIcon) ? 'pl-9 pr-3' : 'px-3'}
        `}
        style={{
          border: '1px solid var(--color-input-border)',
          backgroundColor: disabled ? 'var(--color-surface-light)' : 'var(--color-surface)',
          color: disabled ? 'var(--color-text-muted)' : 'var(--color-text-strong)',
        }}
      />
    </div>
  );
};

// Select Component
type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  size?: 'sm' | 'md';
  className?: string;
  disabled?: boolean;
};

const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  placeholder,
  size = 'md',
  className = '',
  disabled = false,
}) => {
  const sizeClasses = size === 'sm'
    ? 'py-1.5 text-sm'
    : 'py-2 text-sm';

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`
        rounded-md
        focus:outline-none focus:ring-2 focus:ring-primary/30
        disabled:cursor-not-allowed
        transition-colors cursor-pointer
        px-3 pr-8 appearance-none
        bg-no-repeat bg-right
        ${sizeClasses}
        ${className}
      `}
      style={{
        border: '1px solid var(--color-input-border)',
        backgroundColor: disabled ? 'var(--color-surface-light)' : 'var(--color-surface)',
        color: disabled ? 'var(--color-text-muted)' : 'var(--color-text-strong)',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
        backgroundSize: '1.25rem',
        backgroundPosition: 'right 0.5rem center',
      }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

// FilterBar Component - wraps filters in a consistent container
type FilterBarProps = {
  children: React.ReactNode;
  className?: string;
};

const FilterBar: React.FC<FilterBarProps> = ({ children, className = '' }) => (
  <div className={`flex items-center gap-3 p-3 bg-surface border border-surface-border rounded-lg ${className}`}>
    {children}
  </div>
);

export { Input, Select, FilterBar };
export type { InputProps, SelectProps, SelectOption, FilterBarProps };
