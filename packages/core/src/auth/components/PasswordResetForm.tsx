import { getTRPC } from '../../trpc/client';
import { useToast } from '../../shared/toast';
import { useState } from 'react';
import { useNavigate } from 'react-router';

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const calcStrength = (pw: string) => {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[a-z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  return s;
};

type Props = { token: string };

const PasswordResetForm: React.FC<Props> = ({ token }) => {
  const trpc = getTRPC();
  const navigate = useNavigate();
  const toast = useToast();
  const resetPasswordMutation = trpc.auth.resetPassword.useMutation();
  const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const strength = calcStrength(formData.newPassword);

  const validate = () => {
    const e: typeof errors = {};
    if (!formData.newPassword) e.newPassword = 'Password is required';
    else if (strength < 4) e.newPassword = 'Password too weak';
    if (formData.newPassword !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setErrors({});
    try {
      await resetPasswordMutation.mutateAsync({ token, newPassword: formData.newPassword });
      toast({ title: 'Password reset!', description: 'You can now sign in.', status: 'success', duration: 3000, isClosable: true });
      setTimeout(() => navigate('/auth/login'), 2000);
    } catch (err: any) {
      const message = err?.message || 'Reset failed';
      setErrors({ newPassword: message });
      toast({ title: 'Reset failed', description: message, status: 'error', duration: 3000, isClosable: true });
    }
  };

  const inputClass = (key: keyof typeof errors) =>
    `w-full rounded-lg border bg-surface text-text-strong placeholder:text-text-muted
    px-3.5 py-2.5 text-sm outline-none transition-all pr-10
    focus:ring-2 focus:ring-primary/20
    ${errors[key] ? 'border-red-400 focus:border-red-500' : 'border-surface-border focus:border-primary'}`;

  return (
    <div className="rounded-xl border border-surface-border bg-auth-card p-8 shadow-md">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-text-strong mb-1">Set new password</h1>
        <p className="text-sm text-text-muted">Choose a strong password for your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="rp-new" className="block text-sm font-medium text-text mb-1.5">New password</label>
          <div className="relative">
            <input id="rp-new" type={showPw ? 'text' : 'password'} placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
              value={formData.newPassword} onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              className={inputClass('newPassword')} />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
              aria-label="Toggle password">
              {showPw ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          {formData.newPassword && (
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                  i <= strength
                    ? strength <= 2 ? 'bg-red-500' : strength === 3 ? 'bg-yellow-500' : 'bg-emerald-500'
                    : 'bg-surface-light'
                }`} />
              ))}
            </div>
          )}
          {errors.newPassword && <p className="mt-1 text-xs text-red-600">{errors.newPassword}</p>}
        </div>

        <div>
          <label htmlFor="rp-confirm" className="block text-sm font-medium text-text mb-1.5">Confirm password</label>
          <div className="relative">
            <input id="rp-confirm" type={showConfirm ? 'text' : 'password'} placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
              value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className={inputClass('confirmPassword')} />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
              aria-label="Toggle confirm password">
              {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>}
        </div>

        <button type="submit" disabled={resetPasswordMutation.isPending}
          className="w-full py-2.5 px-4 rounded-lg bg-primary hover:bg-primary-dark active:bg-primary-dark
            text-white text-sm font-medium transition-colors
            disabled:opacity-60 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2">
          {resetPasswordMutation.isPending ? 'Resetting…' : 'Reset password'}
        </button>
      </form>
    </div>
  );
};

export { PasswordResetForm };
