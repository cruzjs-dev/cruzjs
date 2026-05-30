import React, { forwardRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SocialProvider = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

export type RegisterBlockProps = React.HTMLAttributes<HTMLDivElement> & {
  title?: string;
  subtitle?: string;
  onSubmit?: (data: {
    name: string;
    email: string;
    password: string;
    acceptTerms: boolean;
  }) => void;
  socialProviders?: SocialProvider[];
  onSocialLogin?: (providerId: string) => void;
  showTerms?: boolean;
  termsLabel?: React.ReactNode;
  loginHref?: string;
  loginLabel?: string;
  loading?: boolean;
  error?: string;
  renderLink?: (props: {
    href: string;
    children: React.ReactNode;
    className: string;
  }) => React.ReactNode;
  logo?: React.ReactNode;
  passwordRequirements?: string[];
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const EyeIcon: React.FC = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon: React.FC = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const LoadingSpinner: React.FC = () => (
  <svg
    className="w-4 h-4 animate-spin"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

const inputClasses =
  'w-full bg-surface-lighter rounded-lg px-3.5 py-2.5 text-sm ring-1 ring-surface-border/50 focus:ring-2 focus:ring-primary/50 focus:bg-surface outline-none transition-all';

function DefaultLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className: string;
}) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export const RegisterBlock = forwardRef<HTMLDivElement, RegisterBlockProps>(
  function RegisterBlock(
    {
      title = 'Create account',
      subtitle = 'Get started for free',
      onSubmit,
      socialProviders,
      onSocialLogin,
      showTerms = true,
      termsLabel = 'I agree to the Terms and Privacy Policy',
      loginHref = '/login',
      loginLabel = 'Already have an account? Sign in',
      loading = false,
      error,
      renderLink,
      logo,
      passwordRequirements,
      className,
      ...rest
    },
    ref,
  ) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const LinkComponent = renderLink ?? DefaultLink;

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault();
      onSubmit?.({ name, email, password, acceptTerms });
    }

    const hasSocial = socialProviders && socialProviders.length > 0;

    return (
      <div
        ref={ref}
        className={['max-w-sm w-full mx-auto', className]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {logo && (
          <div className="mb-6 flex items-center justify-center">{logo}</div>
        )}

        <h1 className="text-2xl font-bold text-text text-center tracking-tight">
          {title}
        </h1>

        {subtitle && (
          <p className="text-sm text-text-secondary text-center mt-1">
            {subtitle}
          </p>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 bg-danger-subtle text-danger-text text-sm rounded-lg px-3.5 py-2.5 ring-1 ring-danger/20"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {/* Name */}
          <div>
            <input
              type="text"
              name="name"
              placeholder="Full name"
              aria-label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClasses}
              autoComplete="name"
              disabled={loading}
            />
          </div>

          {/* Email */}
          <div>
            <input
              type="email"
              name="email"
              placeholder="Email address"
              aria-label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClasses}
              autoComplete="email"
              disabled={loading}
            />
          </div>

          {/* Password */}
          <div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Create a password"
                aria-label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputClasses} pr-10`}
                autoComplete="new-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {passwordRequirements && passwordRequirements.length > 0 && (
              <ul
                className="text-xs mt-1.5 space-y-0.5"
                aria-label="Password requirements"
              >
                {passwordRequirements.map((req) => (
                  <li
                    key={req}
                    className="text-text-muted flex items-start gap-1.5"
                  >
                    <span
                      className="mt-1.5 w-1 h-1 rounded-full bg-current shrink-0"
                      aria-hidden="true"
                    />
                    {req}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Terms */}
          {showTerms && (
            <div className="flex items-start gap-2">
              <input
                id="register-terms"
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5 rounded border-surface-border text-primary focus:ring-primary/50"
                disabled={loading}
              />
              <label
                htmlFor="register-terms"
                className="text-xs text-text-secondary leading-snug cursor-pointer"
              >
                {termsLabel}
              </label>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-surface rounded-lg py-2.5 font-medium text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <LoadingSpinner />}
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        {/* Social Providers */}
        {hasSocial && (
          <>
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-surface-border/50" />
              <span className="text-xs text-text-muted">or continue with</span>
              <div className="flex-1 h-px bg-surface-border/50" />
            </div>

            <div className="flex gap-3">
              {socialProviders.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => onSocialLogin?.(provider.id)}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-surface rounded-lg py-2.5 ring-1 ring-surface-border/50 hover:bg-surface-lighter text-sm font-medium text-text transition-colors"
                >
                  {provider.icon}
                  {provider.label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Login link */}
        <p className="text-sm text-text-secondary text-center mt-6">
          <LinkComponent
            href={loginHref}
            className="text-primary font-medium hover:text-primary-dark"
          >
            {loginLabel}
          </LinkComponent>
        </p>
      </div>
    );
  },
);

RegisterBlock.displayName = 'RegisterBlock';
