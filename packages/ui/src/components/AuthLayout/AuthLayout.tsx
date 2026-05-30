import React, { forwardRef } from 'react';

export type AuthLayoutMaxWidth = 'sm' | 'md' | 'lg';

export type AuthLayoutProps = React.HTMLAttributes<HTMLDivElement> & {
  title?: string;
  subtitle?: string;
  logo?: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: AuthLayoutMaxWidth;
};

const maxWidthStyles: Record<AuthLayoutMaxWidth, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

const cardBg: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  boxShadow:
    '0 1px 3px -1px rgba(0,0,0,0.06), 0 2px 8px -2px rgba(0,0,0,0.04)',
};

const pageBg: React.CSSProperties = {
  background:
    'linear-gradient(to bottom, color-mix(in srgb, var(--color-primary) 3%, var(--color-surface-lighter)), var(--color-surface-lighter))',
};

export const AuthLayout = forwardRef<HTMLDivElement, AuthLayoutProps>(
  function AuthLayout(
    {
      children,
      title,
      subtitle,
      logo,
      footer,
      maxWidth = 'md',
      className,
      ...rest
    },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className={[
          'min-h-screen flex flex-col items-center justify-center px-4 py-12',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={pageBg}
        {...rest}
      >
        {logo && (
          <div className="mb-6 flex items-center justify-center">{logo}</div>
        )}

        <div
          className={[
            'w-full rounded-2xl ring-1 ring-surface-border/50 overflow-hidden',
            maxWidthStyles[maxWidth],
          ].join(' ')}
          style={cardBg}
        >
          {(title || subtitle) && (
            <div className="px-6 pt-6 pb-0">
              {title && (
                <h1 className="text-xl font-semibold text-text-strong tracking-tight">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="mt-1 text-sm text-text-tertiary leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>
          )}

          <div className="px-6 py-5">{children}</div>
        </div>

        {footer && (
          <div className="mt-6 text-center text-sm text-text-muted">
            {footer}
          </div>
        )}
      </div>
    );
  },
);

AuthLayout.displayName = 'AuthLayout';
