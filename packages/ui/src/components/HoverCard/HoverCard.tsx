import React, { forwardRef, useCallback, useEffect, useId, useRef, useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

export type HoverCardPlacement = 'top' | 'bottom' | 'left' | 'right';
export type HoverCardSize = 'sm' | 'md' | 'lg';

export type HoverCardProps = {
  trigger: React.ReactElement;
  children: React.ReactNode;
  openDelay?: number;
  closeDelay?: number;
  placement?: HoverCardPlacement;
  size?: HoverCardSize;
  disabled?: boolean;
  className?: string;
};

type Position = { top: number; left: number };

const SIZE_CLASSES: Record<HoverCardSize, string> = {
  sm: 'max-w-[240px] p-3',
  md: 'max-w-[320px] p-4',
  lg: 'max-w-[420px] p-5',
};

function computePosition(
  trigger: DOMRect,
  card: DOMRect,
  placement: HoverCardPlacement,
  gap: number,
): Position {
  switch (placement) {
    case 'top':
      return {
        top: trigger.top - card.height - gap,
        left: trigger.left + (trigger.width - card.width) / 2,
      };
    case 'bottom':
      return {
        top: trigger.bottom + gap,
        left: trigger.left + (trigger.width - card.width) / 2,
      };
    case 'left':
      return {
        top: trigger.top + (trigger.height - card.height) / 2,
        left: trigger.left - card.width - gap,
      };
    case 'right':
      return {
        top: trigger.top + (trigger.height - card.height) / 2,
        left: trigger.right + gap,
      };
  }
}

function clampToViewport(pos: Position, card: DOMRect, padding: number): Position {
  return {
    top: Math.max(padding, Math.min(pos.top, window.innerHeight - card.height - padding)),
    left: Math.max(padding, Math.min(pos.left, window.innerWidth - card.width - padding)),
  };
}

export const HoverCard = forwardRef<HTMLDivElement, HoverCardProps>(function HoverCard(
  {
    trigger,
    children,
    openDelay = 200,
    closeDelay = 300,
    placement = 'bottom',
    size = 'md',
    disabled = false,
    className,
  },
  ref,
) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout>>();
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const cardId = useId();

  const clearTimers = useCallback(() => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
    }
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
    }
  }, []);

  const show = useCallback(() => {
    clearTimers();
    openTimer.current = setTimeout(() => setOpen(true), openDelay);
  }, [clearTimers, openDelay]);

  const hide = useCallback(() => {
    clearTimers();
    closeTimer.current = setTimeout(() => setOpen(false), closeDelay);
  }, [clearTimers, closeDelay]);

  const updatePosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    const cardEl = cardRef.current;
    if (!triggerEl || !cardEl) {
      return;
    }

    const triggerRect = triggerEl.getBoundingClientRect();
    const cardRect = cardEl.getBoundingClientRect();
    const pos = computePosition(triggerRect, cardRect, placement, 8);
    const clamped = clampToViewport(pos, cardRect, 8);
    setPosition(clamped);
  }, [placement]);

  useEffect(() => {
    if (!open) {
      return;
    }
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    return clearTimers;
  }, [clearTimers]);

  // Mobile: tap-to-expand inline content
  if (isMobile) {
    const mobileTrigger = React.cloneElement(trigger, {
      ref: triggerRef,
      onClick: (e: React.MouseEvent) => {
        if (!disabled) {
          setMobileExpanded((prev) => !prev);
        }
        trigger.props.onClick?.(e);
      },
      'aria-expanded': mobileExpanded,
    });

    return (
      <div ref={ref} className="inline-block">
        {mobileTrigger}
        {mobileExpanded && !disabled && (
          <div
            className={[
              'mt-2 rounded-xl bg-surface p-3',
              'ring-1 ring-surface-border/20',
              'shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)]',
              className,
            ].filter(Boolean).join(' ')}
            style={{
              animation: 'hovercard-expand-in 200ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
            }}
          >
            {children}
          </div>
        )}
        <style>{hovercardKeyframes}</style>
      </div>
    );
  }

  if (disabled) {
    return (
      <div ref={ref} className="inline-block">
        {trigger}
      </div>
    );
  }

  const triggerElement = React.cloneElement(trigger, {
    ref: triggerRef,
    onMouseEnter: (e: React.MouseEvent) => {
      show();
      trigger.props.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      hide();
      trigger.props.onMouseLeave?.(e);
    },
    onFocus: (e: React.FocusEvent) => {
      show();
      trigger.props.onFocus?.(e);
    },
    onBlur: (e: React.FocusEvent) => {
      hide();
      trigger.props.onBlur?.(e);
    },
    'aria-describedby': open ? cardId : undefined,
  });

  return (
    <div ref={ref} className="inline-block">
      {triggerElement}
      {open && (
        <div
          ref={cardRef}
          id={cardId}
          role="tooltip"
          className={[
            'fixed z-50 rounded-2xl bg-surface',
            SIZE_CLASSES[size],
            'shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.05)]',
            'ring-1 ring-surface-border/20',
            className,
          ].filter(Boolean).join(' ')}
          style={{
            top: position.top,
            left: position.left,
            animation: 'hovercard-panel-in 200ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
          }}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          {children}
        </div>
      )}
      <style>{hovercardKeyframes}</style>
    </div>
  );
});

HoverCard.displayName = 'HoverCard';

const hovercardKeyframes = `
  @keyframes hovercard-panel-in {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes hovercard-expand-in {
    from { opacity: 0; transform: scaleY(0.95); transform-origin: top; }
    to { opacity: 1; transform: scaleY(1); transform-origin: top; }
  }
`;
