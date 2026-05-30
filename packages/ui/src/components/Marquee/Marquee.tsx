import React, { forwardRef, useId } from 'react';

export type MarqueeProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Content to scroll */
  children: React.ReactNode;
  /** Scroll speed in pixels per second */
  speed?: number;
  /** Scroll direction */
  direction?: 'left' | 'right';
  /** Pause animation on hover */
  pauseOnHover?: boolean;
  /** Gap between repetitions in px */
  gap?: number;
  /** Additional class name */
  className?: string;
};

export const Marquee = forwardRef<HTMLDivElement, MarqueeProps>(function Marquee(
  {
    children,
    speed = 50,
    direction = 'left',
    pauseOnHover = false,
    gap = 40,
    className,
    style,
    ...rest
  },
  ref,
) {
  const scopeId = useId().replace(/:/g, '-');
  const animationName = `marquee-scroll-${scopeId}`;

  const translateFrom = direction === 'left' ? '0%' : '-100%';
  const translateTo = direction === 'left' ? '-100%' : '0%';

  const keyframes = `
@keyframes ${animationName} {
  from { transform: translateX(${translateFrom}); }
  to { transform: translateX(${translateTo}); }
}
`;

  return (
    <div
      ref={ref}
      className={[
        'overflow-hidden relative',
        className,
      ].filter(Boolean).join(' ')}
      style={style}
      data-testid="marquee"
      {...rest}
    >
      <style>{keyframes}</style>
      <div
        className={[
          'flex w-max',
          pauseOnHover ? 'marquee-pause-on-hover' : '',
        ].filter(Boolean).join(' ')}
        style={{
          animationName,
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
          animationDuration: `${20000 / speed}s`,
          gap: `${gap}px`,
        }}
        data-testid="marquee-track"
        data-direction={direction}
      >
        <div className="flex shrink-0 items-center" style={{ gap: `${gap}px` }} data-testid="marquee-content">
          {children}
        </div>
        <div className="flex shrink-0 items-center" style={{ gap: `${gap}px` }} aria-hidden="true" data-testid="marquee-content-duplicate">
          {children}
        </div>
      </div>
      <style>{`
.marquee-pause-on-hover:hover {
  animation-play-state: paused !important;
}
@media (prefers-reduced-motion: reduce) {
  [data-testid="marquee-track"] {
    animation-play-state: paused !important;
  }
}
`}</style>
    </div>
  );
});

Marquee.displayName = 'Marquee';
