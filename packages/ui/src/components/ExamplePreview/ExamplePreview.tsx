import React, { forwardRef, useCallback, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExamplePreviewProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  code?: string;
  language?: string;
  title?: string;
  description?: string;
  defaultShowCode?: boolean;
  resizable?: boolean;
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const CodeIcon: React.FC<{ className?: string }> = ({ className }) => (
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
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

const SunIcon: React.FC<{ className?: string }> = ({ className }) => (
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
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon: React.FC<{ className?: string }> = ({ className }) => (
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
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

// ─── Utilities ────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ExamplePreview = forwardRef<HTMLDivElement, ExamplePreviewProps>(
  function ExamplePreview(
    {
      children,
      code,
      language,
      title,
      description,
      defaultShowCode = false,
      resizable = false,
      className,
      ...rest
    },
    ref,
  ) {
    const [showCode, setShowCode] = useState(defaultShowCode);
    const [darkBackground, setDarkBackground] = useState(false);

    // ── Resize state ──

    const [previewWidth, setPreviewWidth] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const previewContainerRef = useRef<HTMLDivElement>(null);

    const handleToggleCode = useCallback(() => {
      setShowCode((prev) => !prev);
    }, []);

    const handleToggleBackground = useCallback(() => {
      setDarkBackground((prev) => !prev);
    }, []);

    // ── Resize handlers ──

    const handleResizePointerDown = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        setIsDragging(true);
      },
      [],
    );

    const handleResizePointerMove = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging) {
          return;
        }
        const container = previewContainerRef.current;
        if (!container) {
          return;
        }
        const rect = container.getBoundingClientRect();
        const newWidth = clamp(e.clientX - rect.left, 200, rect.width);
        setPreviewWidth(newWidth);
      },
      [isDragging],
    );

    const handleResizePointerUp = useCallback(() => {
      setIsDragging(false);
    }, []);

    // ── Code lines ──

    const codeLines = code?.split('\n') ?? [];

    return (
      <div
        ref={ref}
        className={[
          'rounded-xl border border-surface-border overflow-hidden',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {/* Header: title, description, toolbar */}
        {(title || description || code) && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border bg-surface">
            <div className="flex flex-col gap-0.5">
              {title && (
                <span
                  className="text-sm font-semibold text-text"
                  data-testid="example-preview-title"
                >
                  {title}
                </span>
              )}
              {description && (
                <span
                  className="text-xs text-text-secondary"
                  data-testid="example-preview-description"
                >
                  {description}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* Dark/light background toggle */}
              <button
                type="button"
                onClick={handleToggleBackground}
                aria-label={darkBackground ? 'Switch to light background' : 'Switch to dark background'}
                data-testid="background-toggle"
                className="p-1.5 rounded text-text-secondary hover:text-text transition-colors duration-150"
              >
                {darkBackground ? (
                  <SunIcon className="w-4 h-4" />
                ) : (
                  <MoonIcon className="w-4 h-4" />
                )}
              </button>
              {/* Show/Hide Code toggle */}
              {code && (
                <button
                  type="button"
                  onClick={handleToggleCode}
                  aria-label={showCode ? 'Hide Code' : 'Show Code'}
                  data-testid="code-toggle"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-text-secondary hover:text-text transition-colors duration-150"
                >
                  <CodeIcon className="w-3.5 h-3.5" />
                  {showCode ? 'Hide Code' : 'Show Code'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Preview area */}
        <div
          ref={previewContainerRef}
          className="relative"
          data-testid="preview-area"
        >
          <div
            className={[
              'p-6',
              darkBackground ? 'bg-dark-surface' : 'bg-surface',
              'transition-colors duration-200',
            ].join(' ')}
            style={
              resizable && previewWidth !== null
                ? { width: `${previewWidth}px` }
                : undefined
            }
            data-testid="preview-content"
          >
            {children}
          </div>

          {/* Resize handle */}
          {resizable && (
            <div
              role="separator"
              aria-label="Resize preview width"
              data-testid="resize-handle"
              onPointerDown={handleResizePointerDown}
              onPointerMove={handleResizePointerMove}
              onPointerUp={handleResizePointerUp}
              className={[
                'absolute top-0 right-0 w-2 h-full cursor-col-resize',
                'flex items-center justify-center',
                'hover:bg-primary/10',
                'transition-colors duration-150 motion-reduce:transition-none',
              ].join(' ')}
            >
              {/* Visual handle indicator */}
              <div className="w-0.5 h-8 rounded-full bg-surface-border" />
            </div>
          )}
        </div>

        {/* Source code area */}
        {showCode && code && (
          <div
            className="border-t border-dark-border bg-dark-surface"
            data-testid="code-area"
          >
            {language && (
              <div className="flex items-center px-4 py-1.5 border-b border-dark-border">
                <span
                  className="text-xs font-mono px-2 py-0.5 rounded bg-dark-surface-lighter text-dark-text-secondary"
                  data-testid="code-language"
                >
                  {language}
                </span>
              </div>
            )}
            <div className="overflow-x-auto">
              <pre className="py-3 text-xs leading-5 font-mono">
                <code>
                  {codeLines.map((line, index) => (
                    <div key={index} className="px-4">
                      <span className="text-dark-text whitespace-pre">{line}</span>
                    </div>
                  ))}
                </code>
              </pre>
            </div>
          </div>
        )}
      </div>
    );
  },
);

ExamplePreview.displayName = 'ExamplePreview';
