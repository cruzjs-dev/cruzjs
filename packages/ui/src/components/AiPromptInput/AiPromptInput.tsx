import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

export type AiPromptInputProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'onSubmit'> & {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  onAttach?: () => void;
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
  maxRows?: number;
  actions?: React.ReactNode;
};

const LINE_HEIGHT = 24;
const PADDING_Y = 24; // py-3 = 12px top + 12px bottom

export const AiPromptInput = forwardRef<HTMLDivElement, AiPromptInputProps>(function AiPromptInput(
  {
    value: controlledValue,
    defaultValue = '',
    onChange,
    onSubmit,
    onAttach,
    placeholder = 'Ask anything...',
    loading = false,
    disabled = false,
    maxRows = 6,
    actions,
    className,
    ...rest
  },
  ref,
) {
  const isMobile = useIsMobile();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const currentValue = isControlled ? controlledValue : internalValue;
  const isEmpty = currentValue.trim().length === 0;
  const isSendDisabled = isEmpty || loading || disabled;

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) {
      return;
    }
    el.style.height = 'auto';
    const maxHeight = LINE_HEIGHT * maxRows + PADDING_Y;
    const next = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [maxRows]);

  useEffect(() => {
    adjustHeight();
  }, [adjustHeight, currentValue]);

  const updateValue = useCallback(
    (next: string) => {
      if (!isControlled) {
        setInternalValue(next);
      }
      onChange?.(next);
    },
    [isControlled, onChange],
  );

  const handleSubmit = useCallback(() => {
    if (isSendDisabled) {
      return;
    }
    onSubmit?.(currentValue);
    if (!isControlled) {
      setInternalValue('');
    }
  }, [isSendDisabled, currentValue, onSubmit, isControlled]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateValue(e.target.value);
    },
    [updateValue],
  );

  return (
    <div
      ref={ref}
      className={[
        'relative border border-input-border bg-surface rounded-2xl transition-all duration-200',
        'focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
        isMobile ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      <textarea
        ref={textareaRef}
        value={currentValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || loading}
        rows={1}
        aria-label={placeholder}
        className={[
          'w-full resize-none bg-transparent text-text text-sm outline-none',
          'px-4 py-3 pr-14',
          'placeholder:text-text-muted',
          disabled ? 'cursor-not-allowed' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          lineHeight: `${LINE_HEIGHT}px`,
          maxHeight: LINE_HEIGHT * maxRows + PADDING_Y,
          overflowY: 'hidden',
        }}
      />

      {/* Bottom bar: attach, actions, loading, send */}
      <div className="flex items-center justify-between px-3 pb-2">
        <div className="flex items-center gap-1">
          {onAttach && (
            <button
              type="button"
              onClick={onAttach}
              disabled={disabled}
              aria-label="Attach file"
              className={[
                'inline-flex items-center justify-center w-8 h-8 rounded-lg',
                'text-text-muted hover:text-text hover:bg-surface-lighter',
                'transition-colors duration-150',
                disabled ? 'opacity-50 cursor-not-allowed' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
          )}
          {actions}
        </div>

        <div className="flex items-center gap-2">
          {loading && (
            <span className="ai-prompt-loading flex items-center gap-1.5 text-xs text-text-muted" aria-label="Loading">
              <span className="ai-prompt-dot w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="ai-prompt-dot w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="ai-prompt-dot w-1.5 h-1.5 rounded-full bg-primary" />
            </span>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSendDisabled}
            aria-label="Send"
            className={[
              'inline-flex items-center justify-center w-8 h-8 rounded-lg',
              'transition-all duration-200',
              isSendDisabled
                ? 'bg-surface-lighter text-text-muted cursor-not-allowed'
                : 'bg-primary text-on-primary hover:opacity-90 active:scale-95',
            ].join(' ')}
            style={
              !isSendDisabled
                ? { transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
                : undefined
            }
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Loading animation styles */}
      <style>{`
        @keyframes ai-prompt-bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
        .ai-prompt-dot:nth-child(1) { animation: ai-prompt-bounce 1.2s ease-in-out infinite; }
        .ai-prompt-dot:nth-child(2) { animation: ai-prompt-bounce 1.2s ease-in-out 0.2s infinite; }
        .ai-prompt-dot:nth-child(3) { animation: ai-prompt-bounce 1.2s ease-in-out 0.4s infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ai-prompt-dot { animation: none !important; }
        }
      `}</style>
    </div>
  );
});

AiPromptInput.displayName = 'AiPromptInput';
