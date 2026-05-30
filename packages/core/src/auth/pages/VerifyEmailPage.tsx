import { getTRPC } from '../../trpc/client';
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { AuthLayout } from '../../framework/components/AuthLayout';

const VerifyEmailPage: React.FC = () => {
  const trpc = getTRPC();
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const verifyEmailMutation = trpc.auth.verifyEmail.useMutation();
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setError('Invalid verification token'); return; }
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    if (!token) return;
    setError(null);
    try {
      await verifyEmailMutation.mutateAsync({ token });
      setVerified(true);
      setTimeout(() => navigate('/auth/login'), 2000);
    } catch (err: any) {
      setError(err?.message || 'Verification failed');
    }
  };

  const card = 'rounded-xl border border-surface-border bg-auth-card p-8 shadow-md text-center';

  if (verifyEmailMutation.isPending && !verified) {
    return (
      <AuthLayout>
        <div className={card}>
          <div className="mx-auto mb-5 w-10 h-10 rounded-full border border-primary/30 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-primary animate-pulse" />
          </div>
          <h1 className="text-xl font-semibold text-text-strong mb-2">Verifying your email&hellip;</h1>
          <p className="text-sm text-text-muted">Just a moment, please wait.</p>
        </div>
      </AuthLayout>
    );
  }

  if (verified) {
    return (
      <AuthLayout>
        <div className={card}>
          <div className="mx-auto mb-5 w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-text-strong mb-2">Email verified!</h1>
          <p className="text-sm text-text-muted">Your email has been verified. Redirecting you to sign in&hellip;</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className={card}>
        <div className="mx-auto mb-5 w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
          <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-text-strong mb-2">Verification failed</h1>
        <p className="text-sm text-red-600 mb-6">
          {error || 'This verification link is invalid or has expired.'}
        </p>
        <div className="space-y-3">
          <button
            onClick={() => navigate('/auth/register')}
            className="w-full py-2.5 px-4 rounded-lg bg-primary hover:bg-primary-dark text-white text-sm font-medium transition-colors"
          >
            Resend verification email
          </button>
          <Link to="/auth/login" className="block text-sm text-primary hover:text-primary-dark transition-colors">
            &larr; Back to sign in
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};

export default VerifyEmailPage;
