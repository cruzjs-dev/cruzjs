import React, { forwardRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ForgotPasswordBlockProps = React.HTMLAttributes<HTMLDivElement> & {
  title?: string;
  description?: string;
  onSubmit?: (email: string) => void;
  loading?: boolean;
  error?: string;
  success?: boolean;
  successMessage?: string;
  backHref?: string;
  backLabel?: string;
  renderLink?: (props: { href: string; children: React.ReactNode; className: string }) => React.ReactNode;
  logo?: React.ReactNode;
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const ArrowLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

export const ForgotPasswordBlock = forwardRef<HTMLDivElement, ForgotPasswordBlockProps>(
  function ForgotPasswordBlock(
    {
      title = 'Forgot password?',
      description = "Enter your email and we'll send you a reset link",
      onSubmit,
      loading = false,
      error,
      success = false,
      successMessage = 'Check your email for a reset link',
      backHref,
      backLabel = 'Back to sign in',
      renderLink,
      logo,
      className,
      ...rest
    },
    ref,
  ) {
    const [email, setEmail] = useState('');

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      onSubmit?.(email);
    };

    const renderBackLink = () => {
      if (!backHref) {
        return null;
      }

      const linkClassName = 'inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text transition-colors';

      if (renderLink) {
        return renderLink({
          href: backHref,
          children: (
            <>
              <ArrowLeftIcon className="w-4 h-4" />
              {backLabel}
            </>
          ),
          className: linkClassName,
        });
      }

      return (
        <a href={backHref} className={linkClassName}>
          <ArrowLeftIcon className="w-4 h-4" />
          {backLabel}
        </a>
      );
    };

    return (
      <div
        ref={ref}
        className={['max-w-sm w-full mx-auto', className].filter(Boolean).join(' ')}
        {...rest}
      >
        {logo && <div className="flex justify-center mb-6">{logo}</div>}

        <h1 className="text-2xl font-bold text-text text-center tracking-tight">{title}</h1>
        <p className="text-sm text-text-secondary text-center mt-1 max-w-xs mx-auto">
          {description}
        </p>

        <div className="mt-6">
          {success ? (
            <div className="text-success bg-success-subtle rounded-2xl p-6 text-center">
              <CheckCircleIcon className="w-10 h-10 mx-auto mb-3" />
              <p className="text-sm font-medium">{successMessage}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="text-sm text-danger bg-danger-subtle rounded-xl px-4 py-3" role="alert">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="forgot-password-email" className="block text-sm font-medium text-text-secondary mb-1.5">
                  Email
                </label>
                <input
                  id="forgot-password-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={loading}
                  className={[
                    'w-full h-10 px-3.5 text-sm rounded-xl border bg-surface text-text outline-none transition-all duration-200',
                    'placeholder:text-text-muted',
                    'border-input-border focus:ring-2 focus:ring-primary/50 focus:border-primary',
                    loading ? 'opacity-50 cursor-not-allowed bg-surface-lighter' : '',
                  ].filter(Boolean).join(' ')}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className={[
                  'w-full h-10 px-4 text-sm font-medium rounded-xl transition-all duration-200',
                  'bg-primary text-primary-foreground hover:bg-primary-dark',
                  'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2',
                  loading ? 'opacity-70 cursor-not-allowed' : '',
                ].filter(Boolean).join(' ')}
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>
          )}
        </div>

        {backHref && (
          <div className="mt-6 text-center">
            {renderBackLink()}
          </div>
        )}
      </div>
    );
  },
);

ForgotPasswordBlock.displayName = 'ForgotPasswordBlock';
