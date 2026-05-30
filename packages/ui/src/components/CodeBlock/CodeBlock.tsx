import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CodeBlockProps = React.HTMLAttributes<HTMLDivElement> & {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  showCopyButton?: boolean;
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const ClipboardIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

export const CodeBlock = forwardRef<HTMLDivElement, CodeBlockProps>(function CodeBlock(
  {
    code,
    language,
    filename,
    showLineNumbers = false,
    highlightLines = [],
    showCopyButton = true,
    className,
    ...rest
  },
  ref,
) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        setCopied(false);
        timerRef.current = null;
      }, 2000);
    } catch {
      // Clipboard API not available or permission denied
    }
  }, [code]);

  const lines = code.split('\n');
  const highlightSet = new Set(highlightLines);
  const hasTitleBar = filename || language;

  return (
    <div
      ref={ref}
      className={[
        'rounded-lg border border-dark-border overflow-hidden',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {/* Title bar */}
      {hasTitleBar && (
        <div className="flex items-center justify-between px-4 py-2 bg-dark-surface border-b border-dark-border">
          {filename && (
            <span className="text-xs font-medium text-dark-text truncate" data-testid="codeblock-filename">
              {filename}
            </span>
          )}
          {language && !filename && <span />}
          {language && (
            <span
              className="text-xs font-mono px-2 py-0.5 rounded bg-dark-surface-lighter text-dark-text-secondary"
              data-testid="codeblock-language"
            >
              {language}
            </span>
          )}
        </div>
      )}

      {/* Code area wrapper */}
      <div className="relative group bg-dark-surface">
        {/* Copy button */}
        {showCopyButton && (
          <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? 'Copied' : 'Copy code'}
            className={[
              'absolute top-2 right-2 z-10 p-1.5 rounded text-dark-text-secondary hover:text-dark-text transition-opacity duration-150',
              isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            ].join(' ')}
          >
            {copied ? (
              <CheckIcon className="w-4 h-4 text-success" />
            ) : (
              <ClipboardIcon className="w-4 h-4" />
            )}
          </button>
        )}

        {/* Code content */}
        <div className="overflow-x-auto" data-testid="codeblock-scroll-container">
          <pre className="py-3 text-xs leading-5 font-mono">
            <code>
              {lines.map((line, index) => {
                const lineNumber = index + 1;
                const isHighlighted = highlightSet.has(lineNumber);

                return (
                  <div
                    key={index}
                    className={[
                      'px-4 flex',
                      isHighlighted ? 'codeblock-highlight' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={
                      isHighlighted
                        ? {
                            backgroundColor:
                              'color-mix(in srgb, var(--color-primary) 15%, var(--color-dark-surface))',
                          }
                        : undefined
                    }
                  >
                    {showLineNumbers && (
                      <span
                        className="text-dark-text-muted select-none shrink-0 text-right inline-block mr-4"
                        style={{ minWidth: `${String(lines.length).length}ch` }}
                        aria-hidden="true"
                      >
                        {lineNumber}
                      </span>
                    )}
                    <span className="text-dark-text whitespace-pre">{line}</span>
                  </div>
                );
              })}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
});

CodeBlock.displayName = 'CodeBlock';
