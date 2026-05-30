import React, { forwardRef } from 'react';

export type PermissionDeniedSize = 'sm' | 'md' | 'lg';

export type PermissionDeniedAction = {
  label: string;
  onClick: () => void;
};

export type PermissionDeniedProps = React.HTMLAttributes<HTMLDivElement> & {
  title?: string;
  message: string;
  icon?: React.ReactNode;
  action?: PermissionDeniedAction;
  secondaryAction?: PermissionDeniedAction;
  size?: PermissionDeniedSize;
};

// ─── Size tokens ────────────────────────────────────────────────────────────

const sizeStyles: Record<PermissionDeniedSize, {
  container: string;
  iconWrap: string;
  iconSvg: string;
  title: string;
  message: string;
  button: string;
  secondaryButton: string;
}> = {
  sm: {
    container: 'py-6 px-4 gap-2',
    iconWrap: 'w-10 h-10 mb-1',
    iconSvg: 'w-5 h-5',
    title: 'text-sm font-semibold',
    message: 'text-xs',
    button: 'px-3 py-1.5 text-xs',
    secondaryButton: 'text-xs',
  },
  md: {
    container: 'py-10 px-6 gap-3',
    iconWrap: 'w-14 h-14 mb-2',
    iconSvg: 'w-7 h-7',
    title: 'text-base font-semibold',
    message: 'text-sm',
    button: 'px-4 py-2 text-sm',
    secondaryButton: 'text-sm',
  },
  lg: {
    container: 'py-16 px-8 gap-4',
    iconWrap: 'w-18 h-18 mb-3',
    iconSvg: 'w-9 h-9',
    title: 'text-lg font-semibold',
    message: 'text-base',
    button: 'px-5 py-2.5 text-base',
    secondaryButton: 'text-base',
  },
};

const iconWrapBg: React.CSSProperties = {
  backgroundColor: 'color-mix(in srgb, var(--color-warning) 10%, var(--color-surface))',
};

// ─── Default shield icon ────────────────────────────────────────────────────

function ShieldIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25z"
      />
    </svg>
  );
}

// ─── PermissionDenied ───────────────────────────────────────────────────────

export const PermissionDenied = forwardRef<HTMLDivElement, PermissionDeniedProps>(function PermissionDenied(
  {
    title = 'Access Denied',
    message,
    icon,
    action,
    secondaryAction,
    size = 'md',
    className,
    ...rest
  },
  ref,
) {
  const s = sizeStyles[size];

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
      <div
        className={[
          'rounded-full flex items-center justify-center shrink-0',
          'text-warning',
          s.iconWrap,
        ].join(' ')}
        style={iconWrapBg}
      >
        {icon ?? <ShieldIcon className={s.iconSvg} />}
      </div>

      <h3 className={['text-text-strong tracking-tight', s.title].join(' ')}>
        {title}
      </h3>

      <p className={['text-text-tertiary leading-relaxed max-w-sm', s.message].join(' ')}>
        {message}
      </p>

      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 mt-2">
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className={[
                'rounded-xl font-medium transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                'bg-primary text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark',
                s.button,
              ].join(' ')}
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
    </div>
  );
});

PermissionDenied.displayName = 'PermissionDenied';
