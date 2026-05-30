import React, { forwardRef } from 'react';

export type EmptyStateSize = 'sm' | 'md' | 'lg';

export type EmptyStateAction = {
  label: string;
  onClick: () => void;
  variant?: 'solid' | 'outline';
};

export type EmptyStateProps = React.HTMLAttributes<HTMLDivElement> & {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: { label: string; onClick: () => void };
  size?: EmptyStateSize;
};

const sizeStyles: Record<EmptyStateSize, {
  container: string;
  iconWrap: string;
  title: string;
  description: string;
  button: string;
  secondaryButton: string;
}> = {
  sm: {
    container: 'py-6 px-4 gap-2',
    iconWrap: 'w-10 h-10 mb-1',
    title: 'text-sm font-semibold',
    description: 'text-xs',
    button: 'px-3 py-1.5 text-xs',
    secondaryButton: 'text-xs',
  },
  md: {
    container: 'py-10 px-6 gap-3',
    iconWrap: 'w-14 h-14 mb-2',
    title: 'text-base font-semibold',
    description: 'text-sm',
    button: 'px-4 py-2 text-sm',
    secondaryButton: 'text-sm',
  },
  lg: {
    container: 'py-16 px-8 gap-4',
    iconWrap: 'w-18 h-18 mb-3',
    title: 'text-lg font-semibold',
    description: 'text-base',
    button: 'px-5 py-2.5 text-base',
    secondaryButton: 'text-base',
  },
};

const iconWrapBg: React.CSSProperties = {
  backgroundColor: 'color-mix(in srgb, var(--color-text-muted) 8%, var(--color-surface))',
};

const solidButtonBg: React.CSSProperties = {};
const outlineButtonBg: React.CSSProperties = {
  backgroundColor: 'color-mix(in srgb, var(--color-primary) 4%, var(--color-surface))',
};

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
  {
    icon,
    title,
    description,
    action,
    secondaryAction,
    size = 'md',
    className,
    children,
    ...rest
  },
  ref,
) {
  const s = sizeStyles[size];
  const actionVariant = action?.variant ?? 'solid';

  return (
    <div
      ref={ref}
      className={[
        'flex flex-col items-center justify-center text-center',
        s.container,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {icon && (
        <div
          className={[
            'rounded-full flex items-center justify-center shrink-0',
            'text-text-muted',
            s.iconWrap,
          ].join(' ')}
          style={iconWrapBg}
        >
          {icon}
        </div>
      )}

      <h3 className={['text-text-strong tracking-tight', s.title].join(' ')}>
        {title}
      </h3>

      {description && (
        <p className={['text-text-tertiary leading-relaxed max-w-sm', s.description].join(' ')}>
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 mt-2">
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className={[
                'rounded-xl font-medium transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                actionVariant === 'solid'
                  ? 'bg-primary text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark'
                  : 'text-primary ring-1 ring-primary/30 hover:ring-primary/50',
                s.button,
              ].join(' ')}
              style={actionVariant === 'outline' ? outlineButtonBg : solidButtonBg}
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className={[
                'font-medium text-text-secondary transition-colors duration-150',
                'hover:text-text-strong',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded',
                s.secondaryButton,
              ].join(' ')}
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}

      {children && <div className="mt-2">{children}</div>}
    </div>
  );
});

EmptyState.displayName = 'EmptyState';
