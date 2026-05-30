import React, { forwardRef, useCallback, useEffect, useRef } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

export type DrawerSide = 'left' | 'right';
export type DrawerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  side?: DrawerSide;
  size?: DrawerSize;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  title?: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

const sizeStyles: Record<DrawerSize, string> = {
  sm: 'max-w-xs',
  md: 'max-w-sm',
  lg: 'max-w-md',
  xl: 'max-w-lg',
  full: 'max-w-full',
};

export const Drawer = forwardRef<HTMLDivElement, DrawerProps>(function Drawer(
  {
    open,
    onClose,
    side = 'right',
    size = 'md',
    closeOnBackdrop = true,
    closeOnEscape = true,
    showCloseButton = true,
    title,
    description,
    footer,
    children,
    className,
  },
  ref,
) {
  const isMobile = useIsMobile();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    },
    [closeOnEscape, onClose],
  );

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement;
    document.addEventListener('keydown', handleEscape);

    const rootEl = panelRef.current?.closest('[data-drawer-root]');
    const siblings = Array.from(document.body.children).filter((c) => c !== rootEl);
    siblings.forEach((s) => s.setAttribute('inert', ''));

    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
    );
    if (focusable?.length) focusable[0].focus();

    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      siblings.forEach((s) => s.removeAttribute('inert'));
      document.body.style.overflow = '';
      previousFocusRef.current?.focus();
    };
  }, [open, handleEscape]);

  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdrop && e.target === e.currentTarget) onClose();
  };

  const titleId = title ? 'drawer-title' : undefined;
  const descId = description ? 'drawer-desc' : undefined;

  if (isMobile) {
    return <MobileDrawer
      ref={ref}
      panelRef={panelRef}
      onClose={onClose}
      onBackdropClick={handleBackdropClick}
      showCloseButton={showCloseButton}
      title={title}
      description={description}
      footer={footer}
      titleId={titleId}
      descId={descId}
      className={className}
    >
      {children}
    </MobileDrawer>;
  }

  const isLeft = side === 'left';
  const slideAnim = isLeft ? 'drawer-slide-left' : 'drawer-slide-right';

  return (
    <div
      data-drawer-root=""
      className="fixed inset-0 z-50 flex"
      onClick={handleBackdropClick}
    >
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px]"
        style={{ animation: 'drawer-backdrop-in 200ms ease-out both' }}
        aria-hidden="true"
      />
      <div
        ref={(node) => {
          (panelRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={[
          'relative z-10 flex h-full w-full flex-col bg-surface',
          'shadow-[0_8px_40px_-8px_rgba(0,0,0,0.2),0_0_0_1px_rgba(0,0,0,0.05)]',
          sizeStyles[size],
          isLeft ? 'mr-auto' : 'ml-auto',
          className,
        ].filter(Boolean).join(' ')}
        style={{
          animation: `${slideAnim} 300ms cubic-bezier(0.16, 1, 0.3, 1) both`,
        }}
      >
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-0 shrink-0">
            <div className="flex-1 min-w-0">
              {title && (
                <h2 id={titleId} className="text-lg font-semibold tracking-tight text-text-strong">
                  {title}
                </h2>
              )}
              {description && (
                <p id={descId} className="mt-1 text-sm text-text-tertiary">
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && <CloseButton onClick={onClose} />}
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-surface-border px-6 py-4 shrink-0">
            {footer}
          </div>
        )}
      </div>
      <style>{drawerKeyframes}</style>
    </div>
  );
});

Drawer.displayName = 'Drawer';

type MobileDrawerProps = {
  onClose: () => void;
  onBackdropClick: (e: React.MouseEvent) => void;
  showCloseButton: boolean;
  title?: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  titleId?: string;
  descId?: string;
  className?: string;
  children: React.ReactNode;
  panelRef: React.RefObject<HTMLDivElement | null>;
};

const MobileDrawer = forwardRef<HTMLDivElement, MobileDrawerProps>(function MobileDrawer(
  { onClose, onBackdropClick, showCloseButton, title, description, footer, titleId, descId, className, children, panelRef },
  ref,
) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;

    let startY = 0;
    let currentY = 0;
    let dragging = false;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select, button, a')) return;
      startY = e.clientY;
      currentY = 0;
      dragging = true;
      el.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      currentY = Math.max(0, e.clientY - startY);
      el.style.transform = `translateY(${currentY}px)`;
    };

    const onPointerUp = () => {
      if (!dragging) return;
      dragging = false;
      el.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      if (currentY > 120) {
        el.style.transform = 'translateY(100%)';
        setTimeout(onClose, 300);
      } else {
        el.style.transform = '';
      }
      setTimeout(() => { if (el) el.style.transition = ''; }, 300);
      currentY = 0;
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
    };
  }, [onClose]);

  return (
    <div
      data-drawer-root=""
      className="fixed inset-0 z-50 flex flex-col justify-end"
      onClick={onBackdropClick}
    >
      <div
        className="fixed inset-0 bg-black/40"
        style={{ animation: 'drawer-backdrop-in 200ms ease-out both' }}
        aria-hidden="true"
      />
      <div
        ref={(node) => {
          (sheetRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          (panelRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={[
          'relative z-10 flex w-full flex-col rounded-t-2xl bg-surface',
          'shadow-[0_-8px_40px_-8px_rgba(0,0,0,0.2)]',
          'max-h-[92vh]',
          className,
        ].filter(Boolean).join(' ')}
        style={{
          animation: 'drawer-sheet-in 300ms cubic-bezier(0.16, 1, 0.3, 1) both',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="mx-auto mt-3 mb-2 h-1 w-10 rounded-full bg-surface-border shrink-0" aria-hidden="true" />
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between gap-4 px-5 pt-2 pb-0 shrink-0">
            <div className="flex-1 min-w-0">
              {title && (
                <h2 id={titleId} className="text-lg font-semibold tracking-tight text-text-strong">
                  {title}
                </h2>
              )}
              {description && (
                <p id={descId} className="mt-1 text-sm text-text-tertiary">
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && <CloseButton onClick={onClose} />}
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-surface-border px-5 py-4 shrink-0">
            {footer}
          </div>
        )}
      </div>
      <style>{drawerKeyframes}</style>
    </div>
  );
});

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className={[
        'shrink-0 rounded-xl p-1.5',
        'text-text-tertiary hover:text-text-secondary',
        'hover:bg-surface-lighter active:bg-surface-border',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2',
      ].join(' ')}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

const drawerKeyframes = `
  @keyframes drawer-backdrop-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes drawer-slide-right {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
  @keyframes drawer-slide-left {
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
  }
  @keyframes drawer-sheet-in {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
`;
