import { AuthLayout } from '../../framework/components/AuthLayout';
import { getTRPC } from '../../trpc/client';
import { useToast } from '../../shared/toast';
import { useState } from 'react';
import { Link } from 'react-router';

const ForgotPasswordPage: React.FC = () => {
  const trpc = getTRPC();
  const toast = useToast();
  const requestResetMutation = trpc.auth.requestPasswordReset.useMutation();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await requestResetMutation.mutateAsync({ email });
      setSubmitted(true);
    } catch (err: any) {
      const message = err?.message || 'Request failed';
      setError(message);
      toast({ title: 'Request failed', description: message, status: 'error', duration: 3000, isClosable: true });
    }
  };

  if (submitted) {
    return (
      <AuthLayout>
        <div className="rounded-xl border border-surface-border bg-auth-card p-8 shadow-md text-center">
          <div className="mx-auto mb-5 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-text-strong mb-2">Check your email</h1>
          <p className="text-sm text-text-muted mb-6">
            If an account exists for <span className="text-text font-medium">{email}</span>, a reset link has been sent.
          </p>
          <Link to="/auth/login" className="text-sm text-primary hover:text-primary-dark transition-colors font-medium">
            &larr; Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="rounded-xl border border-surface-border bg-auth-card p-8 shadow-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-text-strong mb-1">Forgot your password?</h1>
          <p className="text-sm text-text-muted">Enter your email and we&apos;ll send you a reset link</p>
        </div>

        {error && (
          <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="fp-email" className="block text-sm font-medium text-text mb-1.5">Email</label>
            <input
              id="fp-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-surface-border bg-surface text-text-strong placeholder:text-text-muted
                px-3.5 py-2.5 text-sm outline-none
                focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={requestResetMutation.isPending}
            className="w-full py-2.5 px-4 rounded-lg bg-primary hover:bg-primary-dark active:bg-primary-dark
              text-white text-sm font-medium transition-colors
              disabled:opacity-60 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
          >
            {requestResetMutation.isPending ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          <Link to="/auth/login" className="text-primary hover:text-primary-dark transition-colors font-medium">
            &larr; Back to sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
