import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

export type PopoverPlacement = 'top' | 'bottom' | 'left' | 'right';

export type PopoverProps = {
  trigger: React.ReactElement;
  placement?: PopoverPlacement;
  offset?: number;
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;
  children: React.ReactNode;
  className?: string;
};

export const Popover = forwardRef<HTMLDivElement, PopoverProps>(function Popover(
  {
    trigger,
    placement = 'bottom',
    offset: offsetPx = 8,
    closeOnClickOutside = true,
    closeOnEscape = true,
    children,
    className,
  },
  ref,
) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    const panelEl = panelRef.current;
    if (!triggerEl || !panelEl) return;

    const triggerRect = triggerEl.getBoundingClientRect();
    const panelRect = panelEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = triggerRect.top - panelRect.height - offsetPx;
        left = triggerRect.left + (triggerRect.width - panelRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + offsetPx;
        left = triggerRect.left + (triggerRect.width - panelRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - panelRect.height) / 2;
        left = triggerRect.left - panelRect.width - offsetPx;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - panelRect.height) / 2;
        left = triggerRect.right + offsetPx;
        break;
    }

    left = Math.max(8, Math.min(left, vw - panelRect.width - 8));
    top = Math.max(8, Math.min(top, vh - panelRect.height - 8));

    setPosition({ top, left });
  }, [placement, offsetPx]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (!closeOnClickOutside) return;
      const target = e.target as Node;
      if (
        panelRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) return;
      setOpen(false);
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, closeOnClickOutside, closeOnEscape]);

  const handleToggle = () => setOpen((prev) => !prev);

  const triggerElement = React.cloneElement(trigger, {
    ref: triggerRef,
    onClick: (e: React.MouseEvent) => {
      handleToggle();
      trigger.props.onClick?.(e);
    },
    'aria-expanded': open,
    'aria-haspopup': 'dialog' as const,
  });

  if (isMobile) {
    return (
      <div ref={ref} className="inline-block">
        {triggerElement}
        {open && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/30"
              onClick={() => setOpen(false)}
              aria-hidden="true"
              style={{ animation: 'popover-backdrop-in 150ms ease-out both' }}
            />
            <div
              ref={panelRef}
              role="dialog"
              className={[
                'fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-surface p-5',
                'shadow-[0_-8px_40px_-8px_rgba(0,0,0,0.2)]',
                'max-h-[80vh] overflow-y-auto',
                className,
              ].filter(Boolean).join(' ')}
              style={{
                animation: 'popover-sheet-in 250ms cubic-bezier(0.16, 1, 0.3, 1) both',
                paddingBottom: 'env(safe-area-inset-bottom, 20px)',
              }}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-surface-border" aria-hidden="true" />
              {children}
            </div>
          </>
        )}
        <style>{popoverKeyframes}</style>
      </div>
    );
  }

  return (
    <div ref={ref} className="inline-block">
      {triggerElement}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          className={[
            'fixed z-50 rounded-2xl bg-surface p-4',
            'shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.05)]',
            'ring-1 ring-surface-border/50',
            className,
          ].filter(Boolean).join(' ')}
          style={{
            top: position.top,
            left: position.left,
            animation: 'popover-panel-in 200ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
          }}
        >
          {children}
        </div>
      )}
      <style>{popoverKeyframes}</style>
    </div>
  );
});

Popover.displayName = 'Popover';

const popoverKeyframes = `
  @keyframes popover-panel-in {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes popover-backdrop-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes popover-sheet-in {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
`;
