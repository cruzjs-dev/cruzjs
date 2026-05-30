import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CodePlaygroundFile = {
  id: string;
  label: string;
  language?: string;
  code: string;
};

export type CodePlaygroundProps = React.HTMLAttributes<HTMLDivElement> & {
  files: CodePlaygroundFile[];
  activeFileId?: string;
  onActiveFileChange?: (fileId: string) => void;
  onCodeChange?: (fileId: string, code: string) => void;
  preview?: React.ReactNode;
  showPreview?: boolean;
  showLineNumbers?: boolean;
  readOnly?: boolean;
  defaultSplitRatio?: number;
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

const ExpandIcon: React.FC<{ className?: string }> = ({ className }) => (
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
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

const ShrinkIcon: React.FC<{ className?: string }> = ({ className }) => (
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
    <polyline points="4 14 10 14 10 20" />
    <polyline points="20 10 14 10 14 4" />
    <line x1="14" y1="10" x2="21" y2="3" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

// ─── Utilities ────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function countLines(code: string): number {
  if (!code) {
    return 1;
  }
  return code.split('\n').length;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const CodePlayground = forwardRef<HTMLDivElement, CodePlaygroundProps>(
  function CodePlayground(
    {
      files,
      activeFileId,
      onActiveFileChange,
      onCodeChange,
      preview,
      showPreview = false,
      showLineNumbers = true,
      readOnly = false,
      defaultSplitRatio = 0.5,
      className,
      ...rest
    },
    ref,
  ) {
    const isMobile = useIsMobile();

    // ── Active file management ──

    const [internalActiveId, setInternalActiveId] = useState<string>(
      () => activeFileId ?? files[0]?.id ?? '',
    );

    const currentActiveId = activeFileId ?? internalActiveId;

    const activeFile = files.find((f) => f.id === currentActiveId) ?? files[0];

    const handleTabClick = useCallback(
      (fileId: string) => {
        if (activeFileId === undefined) {
          setInternalActiveId(fileId);
        }
        onActiveFileChange?.(fileId);
      },
      [activeFileId, onActiveFileChange],
    );

    // ── Code editing ──

    const handleCodeChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (readOnly || !activeFile) {
          return;
        }
        onCodeChange?.(activeFile.id, e.target.value);
      },
      [readOnly, activeFile, onCodeChange],
    );

    // ── Copy ──

    const [copied, setCopied] = useState(false);
    const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      return () => {
        if (copyTimerRef.current) {
          clearTimeout(copyTimerRef.current);
        }
      };
    }, []);

    const handleCopy = useCallback(async () => {
      if (!activeFile) {
        return;
      }
      try {
        await navigator.clipboard.writeText(activeFile.code);
        setCopied(true);
        if (copyTimerRef.current) {
          clearTimeout(copyTimerRef.current);
        }
        copyTimerRef.current = setTimeout(() => {
          setCopied(false);
          copyTimerRef.current = null;
        }, 2000);
      } catch {
        // Clipboard API not available
      }
    }, [activeFile]);

    // ── Fullscreen ──

    const [isFullscreen, setIsFullscreen] = useState(false);

    const toggleFullscreen = useCallback(() => {
      setIsFullscreen((prev) => !prev);
    }, []);

    // ── Resizable split ──

    const [splitRatio, setSplitRatio] = useState(() => clamp(defaultSplitRatio, 0.2, 0.8));
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleDividerPointerDown = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        setIsDragging(true);
      },
      [],
    );

    const handleDividerPointerMove = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging) {
          return;
        }
        const container = containerRef.current;
        if (!container) {
          return;
        }
        const rect = container.getBoundingClientRect();
        let ratio: number;
        if (isMobile) {
          ratio = (e.clientY - rect.top) / rect.height;
        } else {
          ratio = (e.clientX - rect.left) / rect.width;
        }
        setSplitRatio(clamp(ratio, 0.2, 0.8));
      },
      [isDragging, isMobile],
    );

    const handleDividerPointerUp = useCallback(() => {
      setIsDragging(false);
    }, []);

    // ── Tab keyboard navigation ──

    const handleTabKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLButtonElement>) => {
        const tabs = files.map((f) => f.id);
        const currentIdx = tabs.indexOf(currentActiveId);
        let nextIdx: number | undefined;

        switch (e.key) {
          case 'ArrowRight':
            e.preventDefault();
            nextIdx = (currentIdx + 1) % tabs.length;
            break;
          case 'ArrowLeft':
            e.preventDefault();
            nextIdx = (currentIdx - 1 + tabs.length) % tabs.length;
            break;
          case 'Home':
            e.preventDefault();
            nextIdx = 0;
            break;
          case 'End':
            e.preventDefault();
            nextIdx = tabs.length - 1;
            break;
        }

        if (nextIdx !== undefined) {
          handleTabClick(tabs[nextIdx]);
        }
      },
      [files, currentActiveId, handleTabClick],
    );

    // ── Line numbers ──

    const lineCount = activeFile ? countLines(activeFile.code) : 1;
    const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

    // ── Textarea scroll sync ──

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const lineNumbersRef = useRef<HTMLDivElement>(null);

    const handleTextareaScroll = useCallback(() => {
      if (textareaRef.current && lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
      }
    }, []);

    // ── Render ──

    const showPreviewPane = showPreview && preview !== undefined;

    const editorPanel = (
      <div className="flex flex-col h-full min-h-0 bg-dark-surface" data-testid="code-editor-panel">
        {/* Toolbar: tabs + actions */}
        <div className="flex items-center justify-between border-b border-dark-border shrink-0">
          {/* File tabs */}
          <div
            role="tablist"
            aria-label="File tabs"
            className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {files.map((file) => {
              const isActive = file.id === currentActiveId;
              return (
                <button
                  key={file.id}
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  data-testid={`tab-${file.id}`}
                  onClick={() => handleTabClick(file.id)}
                  onKeyDown={handleTabKeyDown}
                  className={[
                    'px-3 py-2 text-xs font-medium whitespace-nowrap shrink-0',
                    'transition-colors duration-150 motion-reduce:transition-none',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
                    isActive
                      ? 'text-dark-text bg-dark-surface border-b-2 border-primary'
                      : 'text-dark-text-secondary hover:text-dark-text hover:bg-dark-surface-lighter',
                  ].join(' ')}
                >
                  {file.label}
                </button>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 px-2 shrink-0">
            <button
              type="button"
              aria-label={copied ? 'Copied' : 'Copy code'}
              data-testid="copy-button"
              onClick={handleCopy}
              className={[
                'p-1.5 rounded text-dark-text-secondary hover:text-dark-text',
                'transition-colors duration-150 motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
              ].join(' ')}
            >
              {copied ? (
                <CheckIcon className="w-4 h-4 text-success" />
              ) : (
                <ClipboardIcon className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              data-testid="fullscreen-button"
              onClick={toggleFullscreen}
              className={[
                'p-1.5 rounded text-dark-text-secondary hover:text-dark-text',
                'transition-colors duration-150 motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
              ].join(' ')}
            >
              {isFullscreen ? (
                <ShrinkIcon className="w-4 h-4" />
              ) : (
                <ExpandIcon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Editor area: line numbers + textarea */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {showLineNumbers && (
            <div
              ref={lineNumbersRef}
              aria-hidden="true"
              data-testid="line-numbers"
              className="py-3 px-2 text-right select-none overflow-hidden shrink-0 bg-dark-surface border-r border-dark-border"
            >
              {lineNumbers.map((n) => (
                <div
                  key={n}
                  className="text-xs leading-5 text-dark-text-secondary font-mono"
                >
                  {n}
                </div>
              ))}
            </div>
          )}
          <textarea
            ref={textareaRef}
            data-testid="code-textarea"
            value={activeFile?.code ?? ''}
            onChange={handleCodeChange}
            onScroll={handleTextareaScroll}
            readOnly={readOnly}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            className={[
              'flex-1 min-h-0 py-3 px-3 bg-dark-surface text-dark-text font-mono text-xs leading-5',
              'resize-none outline-none border-none',
              'overflow-auto',
              readOnly ? 'cursor-default' : 'cursor-text',
            ].join(' ')}
            style={{ tabSize: 2 }}
          />
        </div>
      </div>
    );

    const previewPanel = showPreviewPane ? (
      <div
        className="flex flex-col h-full min-h-0 bg-surface"
        data-testid="preview-panel"
      >
        <div className="px-3 py-2 text-xs font-medium text-text-secondary border-b border-surface-border shrink-0">
          Preview
        </div>
        <div className="flex-1 min-h-0 overflow-auto p-3">
          {preview}
        </div>
      </div>
    ) : null;

    const isVertical = isMobile;

    const contentArea = showPreviewPane ? (
      <div
        ref={containerRef}
        className={['flex flex-1 min-h-0 overflow-hidden', isVertical ? 'flex-col' : 'flex-row'].join(' ')}
        data-testid="split-container"
      >
        {/* Editor pane */}
        <div
          className="overflow-hidden min-h-0"
          style={{
            flexBasis: `${splitRatio * 100}%`,
            flexShrink: 0,
            flexGrow: 0,
            transition: isDragging ? 'none' : 'flex-basis 150ms ease',
          }}
        >
          {editorPanel}
        </div>

        {/* Drag handle */}
        <div
          role="separator"
          aria-label="Resize editor and preview"
          data-testid="split-divider"
          onPointerDown={handleDividerPointerDown}
          onPointerMove={handleDividerPointerMove}
          onPointerUp={handleDividerPointerUp}
          className={[
            'shrink-0 relative z-10',
            isVertical ? 'h-1 cursor-row-resize' : 'w-1 cursor-col-resize',
            'bg-dark-border hover:bg-primary',
            'transition-colors duration-150 motion-reduce:transition-none',
          ].join(' ')}
        >
          {/* Expanded hit zone */}
          <div
            className="absolute"
            style={
              isVertical
                ? { left: 0, right: 0, top: '-3px', bottom: '-3px' }
                : { top: 0, bottom: 0, left: '-3px', right: '-3px' }
            }
          />
        </div>

        {/* Preview pane */}
        <div
          className="overflow-hidden min-h-0"
          style={{
            flexBasis: `${(1 - splitRatio) * 100}%`,
            flexShrink: 0,
            flexGrow: 0,
            transition: isDragging ? 'none' : 'flex-basis 150ms ease',
          }}
        >
          {previewPanel}
        </div>
      </div>
    ) : (
      <div className="flex-1 min-h-0 overflow-hidden">{editorPanel}</div>
    );

    return (
      <div
        ref={ref}
        data-testid="code-playground"
        className={[
          'flex flex-col overflow-hidden rounded-lg border border-dark-border',
          isFullscreen
            ? 'fixed inset-0 z-50 rounded-none border-none'
            : 'h-80',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {contentArea}
      </div>
    );
  },
);

CodePlayground.displayName = 'CodePlayground';
