import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';

export type FloatingWindowProps = {
  title?: string;
  children: React.ReactNode;
  open?: boolean;
  onClose?: () => void;
  defaultPosition?: { x: number; y: number };
  defaultSize?: { width: number; height: number };
  minWidth?: number;
  minHeight?: number;
  resizable?: boolean;
  className?: string;
};

export const FloatingWindow = forwardRef<HTMLDivElement, FloatingWindowProps>(
  function FloatingWindow(
    {
      title,
      children,
      open = true,
      onClose,
      defaultPosition = { x: 100, y: 100 },
      defaultSize = { width: 400, height: 300 },
      minWidth = 200,
      minHeight = 150,
      resizable = true,
      className,
    },
    ref,
  ) {
    const panelRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState(defaultPosition);
    const [size, setSize] = useState(defaultSize);

    const clampPosition = useCallback(
      (x: number, y: number, w: number, h: number) => {
        if (typeof window === 'undefined') {
          return { x, y };
        }
        const maxX = window.innerWidth - w;
        const maxY = window.innerHeight - h;
        return {
          x: Math.max(0, Math.min(x, maxX)),
          y: Math.max(0, Math.min(y, maxY)),
        };
      },
      [],
    );

    // --- Drag ---
    const handleTitleBarPointerDown = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.closest('button')) {
          return;
        }

        e.preventDefault();
        const titleBar = e.currentTarget;
        titleBar.setPointerCapture(e.pointerId);

        const startX = e.clientX;
        const startY = e.clientY;
        const startPos = { ...position };

        const onPointerMove = (ev: PointerEvent) => {
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          const clamped = clampPosition(startPos.x + dx, startPos.y + dy, size.width, size.height);
          setPosition(clamped);
        };

        const onPointerUp = () => {
          titleBar.removeEventListener('pointermove', onPointerMove);
          titleBar.removeEventListener('pointerup', onPointerUp);
        };

        titleBar.addEventListener('pointermove', onPointerMove);
        titleBar.addEventListener('pointerup', onPointerUp);
      },
      [position, size.width, size.height, clampPosition],
    );

    // --- Resize ---
    const handleResizePointerDown = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const handle = e.currentTarget;
        handle.setPointerCapture(e.pointerId);

        const startX = e.clientX;
        const startY = e.clientY;
        const startSize = { ...size };

        const onPointerMove = (ev: PointerEvent) => {
          const newWidth = Math.max(minWidth, startSize.width + (ev.clientX - startX));
          const newHeight = Math.max(minHeight, startSize.height + (ev.clientY - startY));
          setSize({ width: newWidth, height: newHeight });
        };

        const onPointerUp = () => {
          handle.removeEventListener('pointermove', onPointerMove);
          handle.removeEventListener('pointerup', onPointerUp);
        };

        handle.addEventListener('pointermove', onPointerMove);
        handle.addEventListener('pointerup', onPointerUp);
      },
      [size, minWidth, minHeight],
    );

    // --- Escape to close ---
    useEffect(() => {
      if (!open || !onClose) {
        return;
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [open, onClose]);

    if (!open) {
      return null;
    }

    return (
      <div
        ref={(node) => {
          (panelRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
          }
        }}
        role="dialog"
        aria-label={title ?? 'Floating window'}
        data-testid="floating-window"
        className={[
          'fixed z-50 flex flex-col rounded-xl bg-surface',
          'shadow-xl ring-1 ring-surface-border/20',
          'overflow-hidden',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          left: position.x,
          top: position.y,
          width: size.width,
          height: size.height,
          animation: 'floating-window-in 250ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        }}
      >
        {/* Title bar / drag handle */}
        <div
          data-testid="floating-window-titlebar"
          onPointerDown={handleTitleBarPointerDown}
          className={[
            'flex items-center justify-between gap-2 px-4 py-2.5 shrink-0',
            'bg-surface-lighter select-none cursor-grab active:cursor-grabbing',
            'border-b border-surface-border',
          ].join(' ')}
        >
          <span className="text-sm font-semibold tracking-tight text-text-strong truncate">
            {title}
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={[
                'shrink-0 rounded-lg p-1',
                'text-text-tertiary hover:text-text-secondary',
                'hover:bg-surface active:bg-surface-border',
                'transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              ].join(' ')}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3">{children}</div>

        {/* Resize handle */}
        {resizable && (
          <div
            data-testid="floating-window-resize"
            onPointerDown={handleResizePointerDown}
            className={[
              'absolute bottom-0 right-0 w-4 h-4 cursor-se-resize',
              'flex items-center justify-center',
              'text-text-quaternary hover:text-text-tertiary transition-colors',
            ].join(' ')}
            aria-hidden="true"
          >
            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
              <circle cx="9" cy="9" r="1.2" />
              <circle cx="5" cy="9" r="1.2" />
              <circle cx="9" cy="5" r="1.2" />
            </svg>
          </div>
        )}

        <style>{floatingWindowKeyframes}</style>
      </div>
    );
  },
);

FloatingWindow.displayName = 'FloatingWindow';

const floatingWindowKeyframes = `
  @keyframes floating-window-in {
    from { opacity: 0; transform: scale(0.92); }
    to { opacity: 1; transform: scale(1); }
  }
`;
