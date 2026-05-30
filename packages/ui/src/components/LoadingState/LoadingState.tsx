import React, { forwardRef } from 'react';

export type LoadingStateSize = 'sm' | 'md' | 'lg' | 'xl';
export type LoadingStateVariant = 'spinner' | 'skeleton' | 'dots';

export type LoadingStateProps = React.HTMLAttributes<HTMLDivElement> & {
  size?: LoadingStateSize;
  text?: string;
  description?: string;
  variant?: LoadingStateVariant;
  fullPage?: boolean;
};

// ─── Size tokens ────────────────────────────────────────────────────────────

const sizeStyles: Record<LoadingStateSize, {
  spinner: string;
  thickness: number;
  dot: string;
  text: string;
  description: string;
  gap: string;
  skeletonHeight: string;
}> = {
  sm: {
    spinner: 'w-4 h-4',
    thickness: 2,
    dot: 'w-1.5 h-1.5',
    text: 'text-xs',
    description: 'text-xs',
    gap: 'gap-2',
    skeletonHeight: '0.625rem',
  },
  md: {
    spinner: 'w-6 h-6',
    thickness: 2.5,
    dot: 'w-2 h-2',
    text: 'text-sm',
    description: 'text-xs',
    gap: 'gap-3',
    skeletonHeight: '0.75rem',
  },
  lg: {
    spinner: 'w-8 h-8',
    thickness: 3,
    dot: 'w-2.5 h-2.5',
    text: 'text-base',
    description: 'text-sm',
    gap: 'gap-3',
    skeletonHeight: '0.875rem',
  },
  xl: {
    spinner: 'w-12 h-12',
    thickness: 3,
    dot: 'w-3 h-3',
    text: 'text-lg',
    description: 'text-sm',
    gap: 'gap-4',
    skeletonHeight: '1rem',
  },
};

// ─── Spinner variant ────────────────────────────────────────────────────────

function SpinnerIndicator({ size }: { size: LoadingStateSize }) {
  const s = sizeStyles[size];

  return (
    <span className={['inline-flex items-center justify-center shrink-0', s.spinner].join(' ')}>
      <svg
        className="animate-spin"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={{ width: '100%', height: '100%' }}
      >
        <circle
          cx="12"
          cy="12"
          r={10}
          stroke="color-mix(in srgb, var(--color-primary) 15%, transparent)"
          strokeWidth={s.thickness}
        />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="var(--color-primary)"
          strokeWidth={s.thickness}
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

// ─── Dots variant ───────────────────────────────────────────────────────────

function DotsIndicator({ size }: { size: LoadingStateSize }) {
  const s = sizeStyles[size];

  return (
    <span className="inline-flex items-center gap-1.5" aria-hidden="true" data-testid="loading-dots">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={['rounded-full', s.dot].join(' ')}
          style={{
            backgroundColor: 'var(--color-primary)',
            animation: `cruz-loading-bounce 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.16}s infinite both`,
          }}
        />
      ))}
      <style>{`
        @keyframes cruz-loading-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </span>
  );
}

// ─── Skeleton variant ───────────────────────────────────────────────────────

function SkeletonIndicator({ size }: { size: LoadingStateSize }) {
  const s = sizeStyles[size];

  return (
    <div className="flex flex-col gap-2 w-full max-w-xs" aria-hidden="true" data-testid="loading-skeleton">
      {[100, 100, 75].map((widthPct, i) => (
        <div
          key={i}
          className="rounded-md shimmer"
          style={{
            width: `${widthPct}%`,
            height: s.skeletonHeight,
          }}
        />
      ))}
    </div>
  );
}

// ─── LoadingState ───────────────────────────────────────────────────────────

export const LoadingState = forwardRef<HTMLDivElement, LoadingStateProps>(function LoadingState(
  {
    size = 'xl',
    text,
    description,
    variant = 'spinner',
    fullPage = false,
    className,
    ...rest
  },
  ref,
) {
  const s = sizeStyles[size];

  const indicator =
    variant === 'spinner' ? <SpinnerIndicator size={size} /> :
    variant === 'dots' ? <DotsIndicator size={size} /> :
    <SkeletonIndicator size={size} />;

  return (
    <div
      ref={ref}
      role="status"
      aria-label="Loading"
      aria-live="polite"
      className={[
        'flex flex-col items-center justify-center',
        s.gap,
        fullPage ? 'min-h-[60vh]' : 'py-12',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {indicator}

      {text && (
        <p className={['text-text-muted font-medium', s.text].join(' ')}>
          {text}
        </p>
      )}

      {description && (
        <p className={['text-text-tertiary leading-relaxed max-w-sm text-center', s.description].join(' ')}>
          {description}
        </p>
      )}
    </div>
  );
});

LoadingState.displayName = 'LoadingState';
