import { getTRPC } from '../../trpc/client';
import { useToast } from '../../shared/toast';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const LoginForm: React.FC = () => {
  const trpc = getTRPC();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const loginMutation = trpc.auth.login.useMutation();
  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false });
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const data = await loginMutation.mutateAsync({
        email: formData.email,
        password: formData.password,
      });
      // Server set HttpOnly auth cookie via Set-Cookie. Use a hard navigation so
      // the destination is server-rendered WITH the cookie — a client-side SPA
      // navigate races the auth-state cache and can bounce back to a public route.
      window.location.assign(searchParams.get('redirect') || '/dashboard');
    } catch (err: any) {
      const message = err?.message || 'Login failed';
      setError(message);
      toast({ title: 'Login failed', description: message, status: 'error', duration: 3000, isClosable: true });
    }
  };

  return (
    <div className="rounded-xl border border-surface-border bg-auth-card p-8 shadow-md">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-text-strong mb-1">Welcome back</h1>
        <p className="text-sm text-text-muted">Sign in to your account to continue</p>
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium text-text mb-1.5">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            className="w-full rounded-lg border border-surface-border bg-surface text-text-strong placeholder:text-text-muted
              px-3.5 py-2.5 text-sm outline-none
              focus:border-primary focus:ring-2 focus:ring-primary/20
              transition-all"
          />
        </div>

        <div>
          <label htmlFor="login-password" className="block text-sm font-medium text-text mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              className="w-full rounded-lg border border-surface-border bg-surface text-text-strong placeholder:text-text-muted
                px-3.5 py-2.5 pr-10 text-sm outline-none
                focus:border-primary focus:ring-2 focus:ring-primary/20
                transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={formData.rememberMe}
              onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
              className="w-4 h-4 rounded border-surface-border accent-primary cursor-pointer"
            />
            <span className="text-sm text-text">Remember me</span>
          </label>
          <Link
            to="/auth/forgot-password"
            className="text-sm text-primary hover:text-primary-dark transition-colors font-medium"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="w-full py-2.5 px-4 rounded-lg bg-primary hover:bg-primary-dark active:bg-primary-dark
            text-white text-sm font-medium transition-colors
            disabled:opacity-60 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
        >
          {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-muted">
        Don&apos;t have an account?{' '}
        <Link to="/auth/register" className="text-primary hover:text-primary-dark font-medium transition-colors">
          Create one
        </Link>
      </p>
    </div>
  );
};

export { LoginForm };
