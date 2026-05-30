import React, { forwardRef, useState, useRef, useCallback, useEffect } from 'react';

export type TagsInputSize = 'sm' | 'md' | 'lg';

export type TagsInputProps = {
  label?: React.ReactNode;
  description?: string;
  error?: string;
  value?: string[];
  defaultValue?: string[];
  onChange?: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  allowDuplicates?: boolean;
  separator?: string | string[];
  size?: TagsInputSize;
  disabled?: boolean;
  className?: string;
};

const sizeStyles: Record<TagsInputSize, { container: string; input: string; label: string; tag: string; tagText: string; removeBtn: string }> = {
  sm: {
    container: 'min-h-8 px-2 py-1 gap-1 rounded-lg',
    input: 'text-xs h-5',
    label: 'text-xs',
    tag: 'px-1.5 py-px gap-0.5 rounded',
    tagText: 'text-[10px]',
    removeBtn: 'w-3 h-3',
  },
  md: {
    container: 'min-h-10 px-2.5 py-1.5 gap-1.5 rounded-xl',
    input: 'text-sm h-6',
    label: 'text-sm',
    tag: 'px-2 py-0.5 gap-1 rounded-md',
    tagText: 'text-xs',
    removeBtn: 'w-3.5 h-3.5',
  },
  lg: {
    container: 'min-h-12 px-3 py-2 gap-2 rounded-xl',
    input: 'text-base h-7',
    label: 'text-sm',
    tag: 'px-2.5 py-1 gap-1.5 rounded-lg',
    tagText: 'text-sm',
    removeBtn: 'w-4 h-4',
  },
};

const tagBgStyle: React.CSSProperties = {
  backgroundColor: 'color-mix(in srgb, var(--color-primary) 8%, var(--color-surface))',
};

const tagAppearKeyframes = `
@keyframes cruzTagAppear {
  0% { transform: scale(0.6); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
`;

function normalizeSeparators(separator: string | string[] | undefined): string[] {
  if (separator === undefined) {
    return [','];
  }
  if (typeof separator === 'string') {
    return [separator];
  }
  return separator.filter((s) => s !== 'Enter');
}

export const TagsInput = forwardRef<HTMLInputElement, TagsInputProps>(function TagsInput(
  {
    label,
    description,
    error,
    value: controlledValue,
    defaultValue,
    onChange,
    placeholder,
    maxTags,
    allowDuplicates = false,
    separator,
    size = 'md',
    disabled = false,
    className,
  },
  ref,
) {
  const isControlled = controlledValue !== undefined;
  const [internalTags, setInternalTags] = useState<string[]>(defaultValue ?? []);
  const tags = isControlled ? controlledValue : internalTags;

  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const styleInjectedRef = useRef(false);
  const s = sizeStyles[size];
  const hasError = !!error;
  const inputId = label ? `tags-input-${Math.random().toString(36).slice(2, 9)}` : undefined;
  const charSeparators = normalizeSeparators(separator);
  const separatorIncludesEnter = separator === undefined || (
    Array.isArray(separator) ? separator.includes('Enter') : separator === 'Enter'
  );

  // Inject keyframes once
  useEffect(() => {
    if (styleInjectedRef.current || typeof document === 'undefined') {
      return;
    }
    styleInjectedRef.current = true;
    const styleEl = document.createElement('style');
    styleEl.textContent = tagAppearKeyframes;
    document.head.appendChild(styleEl);
  }, []);

  const setRef = useCallback(
    (el: HTMLInputElement | null) => {
      (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
      if (typeof ref === 'function') {
        ref(el);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
      }
    },
    [ref],
  );

  const updateTags = useCallback(
    (newTags: string[]) => {
      if (!isControlled) {
        setInternalTags(newTags);
      }
      onChange?.(newTags);
    },
    [isControlled, onChange],
  );

  const addTag = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) {
        return;
      }
      if (maxTags !== undefined && tags.length >= maxTags) {
        return;
      }
      if (!allowDuplicates && tags.includes(trimmed)) {
        return;
      }
      updateTags([...tags, trimmed]);
      setInputValue('');
    },
    [tags, maxTags, allowDuplicates, updateTags],
  );

  const removeTag = useCallback(
    (index: number) => {
      if (disabled) {
        return;
      }
      const newTags = tags.filter((_, i) => i !== index);
      updateTags(newTags);
    },
    [tags, disabled, updateTags],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && separatorIncludesEnter) {
        e.preventDefault();
        addTag(inputValue);
        return;
      }
      if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
        removeTag(tags.length - 1);
      }
    },
    [inputValue, tags, addTag, removeTag, separatorIncludesEnter],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;

      // Check if the input ends with any character separator
      for (const sep of charSeparators) {
        if (sep && val.endsWith(sep)) {
          const tagValue = val.slice(0, -sep.length);
          addTag(tagValue);
          return;
        }
      }

      setInputValue(val);
    },
    [charSeparators, addTag],
  );

  const handleContainerClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  const atLimit = maxTags !== undefined && tags.length >= maxTags;

  return (
    <div className={['w-full', className].filter(Boolean).join(' ')}>
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
        role="group"
        aria-label={typeof label === 'string' ? label : 'Tags input'}
        onClick={handleContainerClick}
        className={[
          'flex flex-wrap items-center border bg-surface text-text transition-all duration-200 cursor-text',
          s.container,
          hasError
            ? 'border-danger focus-within:ring-2 focus-within:ring-danger/30 focus-within:border-danger'
            : isFocused
              ? 'border-primary ring-2 ring-primary/50'
              : 'border-input-border',
          disabled ? 'opacity-50 cursor-not-allowed bg-surface-lighter' : '',
        ].filter(Boolean).join(' ')}
      >
        {tags.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className={[
              'inline-flex items-center font-medium ring-1 ring-primary/20 shrink-0',
              s.tag,
              s.tagText,
              'text-primary',
            ].join(' ')}
            style={{
              ...tagBgStyle,
              animation: 'cruzTagAppear 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both',
            }}
          >
            <span>{tag}</span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(index);
                }}
                className={[
                  'inline-flex items-center justify-center rounded-sm text-primary/60 hover:text-primary hover:bg-primary/10 transition-colors duration-150 shrink-0',
                  s.removeBtn,
                ].join(' ')}
                aria-label={`Remove ${tag}`}
                tabIndex={-1}
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="w-full h-full"
                >
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            )}
          </span>
        ))}
        <input
          ref={setRef}
          id={inputId}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={tags.length === 0 ? placeholder : atLimit ? '' : placeholder}
          disabled={disabled || atLimit}
          className={[
            'flex-1 min-w-[60px] bg-transparent outline-none text-text placeholder:text-text-muted',
            s.input,
            disabled ? 'cursor-not-allowed' : '',
          ].filter(Boolean).join(' ')}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError && inputId ? `${inputId}-error` : undefined}
        />
      </div>
      {error && (
        <p
          id={inputId ? `${inputId}-error` : undefined}
          className="mt-1.5 text-xs text-danger"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
});

TagsInput.displayName = 'TagsInput';
