import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export type TooltipProps = {
  content: React.ReactNode;
  placement?: TooltipPlacement;
  delayOpen?: number;
  delayClose?: number;
  disabled?: boolean;
  children: React.ReactElement;
};

type Position = { top: number; left: number };

function computePosition(
  trigger: DOMRect,
  tooltip: DOMRect,
  placement: TooltipPlacement,
  gap: number,
): Position {
  switch (placement) {
    case 'top':
      return {
        top: trigger.top - tooltip.height - gap,
        left: trigger.left + (trigger.width - tooltip.width) / 2,
      };
    case 'bottom':
      return {
        top: trigger.bottom + gap,
        left: trigger.left + (trigger.width - tooltip.width) / 2,
      };
    case 'left':
      return {
        top: trigger.top + (trigger.height - tooltip.height) / 2,
        left: trigger.left - tooltip.width - gap,
      };
    case 'right':
      return {
        top: trigger.top + (trigger.height - tooltip.height) / 2,
        left: trigger.right + gap,
      };
  }
}

function clampToViewport(pos: Position, tooltip: DOMRect, padding: number): Position {
  return {
    top: Math.max(padding, Math.min(pos.top, window.innerHeight - tooltip.height - padding)),
    left: Math.max(padding, Math.min(pos.left, window.innerWidth - tooltip.width - padding)),
  };
}

export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(function Tooltip(
  {
    content,
    placement = 'top',
    delayOpen = 300,
    delayClose = 100,
    disabled = false,
    children,
  },
  ref,
) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout>>();
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();

  const clearTimers = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const show = useCallback(() => {
    clearTimers();
    openTimer.current = setTimeout(() => setOpen(true), delayOpen);
  }, [clearTimers, delayOpen]);

  const hide = useCallback(() => {
    clearTimers();
    closeTimer.current = setTimeout(() => setOpen(false), delayClose);
  }, [clearTimers, delayClose]);

  useEffect(() => {
    if (!open || !triggerRef.current || !tooltipRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const pos = computePosition(triggerRect, tooltipRect, placement, 8);
    const clamped = clampToViewport(pos, tooltipRect, 8);
    setPosition(clamped);
  }, [open, placement]);

  useEffect(() => {
    return clearTimers;
  }, [clearTimers]);

  if (isMobile || disabled) {
    return <>{children}</>;
  }

  const child = React.Children.only(children);

  const triggerProps = {
    ref: triggerRef,
    onMouseEnter: (e: React.MouseEvent) => {
      show();
      if (typeof (child.props as Record<string, unknown>).onMouseEnter === 'function') {
        (child.props as Record<string, (e: React.MouseEvent) => void>).onMouseEnter(e);
      }
    },
    onMouseLeave: (e: React.MouseEvent) => {
      hide();
      if (typeof (child.props as Record<string, unknown>).onMouseLeave === 'function') {
        (child.props as Record<string, (e: React.MouseEvent) => void>).onMouseLeave(e);
      }
    },
    onFocus: (e: React.FocusEvent) => {
      show();
      if (typeof (child.props as Record<string, unknown>).onFocus === 'function') {
        (child.props as Record<string, (e: React.FocusEvent) => void>).onFocus(e);
      }
    },
    onBlur: (e: React.FocusEvent) => {
      hide();
      if (typeof (child.props as Record<string, unknown>).onBlur === 'function') {
        (child.props as Record<string, (e: React.FocusEvent) => void>).onBlur(e);
      }
    },
    'aria-describedby': open ? 'cruz-tooltip' : undefined,
  };

  return (
    <>
      {React.cloneElement(child, triggerProps)}
      {open && (
        <div
          ref={(node) => {
            (tooltipRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
          }}
          id="cruz-tooltip"
          role="tooltip"
          className={[
            'fixed z-50 px-3 py-1.5 rounded-lg',
            'text-xs font-medium leading-snug',
            'shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08),0_8px_24px_-4px_rgba(0,0,0,0.06)]',
            'animate-spring-in pointer-events-none',
          ].join(' ')}
          style={{
            top: position.top,
            left: position.left,
            backgroundColor: 'var(--color-dark-surface)',
            color: 'var(--color-dark-text)',
          }}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          {content}
        </div>
      )}
    </>
  );
});

Tooltip.displayName = 'Tooltip';
