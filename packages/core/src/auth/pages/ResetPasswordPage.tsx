import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { AuthLayout } from '../../framework/components/AuthLayout';
import { PasswordResetForm } from '../components/PasswordResetForm';

const ResetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [validating, setValidating] = useState(true);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate('/auth/login');
      return;
    }

    setValidating(false);
    setValid(true);
  }, [token, navigate]);

  if (validating) {
    return (
      <AuthLayout>
        <div className="rounded-xl border border-surface-border bg-auth-card p-8 shadow-md text-center">
          <h1 className="text-2xl font-semibold text-text-strong mb-2">Validating token...</h1>
          <div className="flex justify-center mt-4">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (!valid || !token) {
    return (
      <AuthLayout>
        <div className="rounded-xl border border-surface-border bg-auth-card p-8 shadow-md text-center">
          <div className="mx-auto mb-5 w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-text-strong mb-2">Invalid Token</h1>
          <p className="text-sm text-text-muted mb-6">
            This password reset link is invalid or has expired.
          </p>
          <Link to="/auth/forgot-password" className="text-sm text-primary hover:text-primary-dark transition-colors font-medium">
            Request a new reset link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <PasswordResetForm token={token} />
    </AuthLayout>
  );
};

export default ResetPasswordPage;
