import { getTRPC } from '../../trpc/client';
import { useToast } from '../../shared/toast';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

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

const StrengthBar: React.FC<{ score: number }> = ({ score }) => {
  const colors = ['bg-surface-light', 'bg-red-500', 'bg-red-500', 'bg-yellow-500', 'bg-emerald-500'];
  const labels = ['', 'Weak', 'Weak', 'Fair', 'Strong'];
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all ${i <= score ? colors[score] : 'bg-surface-light'}`}
          />
        ))}
      </div>
      {score > 0 && (
        <p className={`text-xs ${score <= 2 ? 'text-red-600' : score === 3 ? 'text-yellow-600' : 'text-emerald-600'}`}>
          {labels[score]}
        </p>
      )}
    </div>
  );
};

type FormData = { name: string; email: string; password: string; confirmPassword: string; inviteCode: string; terms: boolean };
type Errors = Partial<Record<keyof FormData, string>>;

const calculatePasswordStrength = (pw: string) => {
  let score = 0;
  const hints: string[] = [];
  if (pw.length >= 8) score++; else hints.push('At least 8 characters');
  if (/[A-Z]/.test(pw)) score++; else hints.push('One uppercase letter');
  if (/[a-z]/.test(pw)) score++; else hints.push('One lowercase letter');
  if (/[0-9]/.test(pw)) score++; else hints.push('One number');
  return { score, hints };
};

const RegisterForm: React.FC = () => {
  const trpc = getTRPC();
  const navigate = useNavigate();
  const toast = useToast();
  const registerMutation = trpc.auth.register.useMutation();
  const { data: features } = trpc.app.features.useQuery();

  const [formData, setFormData] = useState<FormData>({
    name: '', email: '', password: '', confirmPassword: '', inviteCode: '', terms: false,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const strength = calculatePasswordStrength(formData.password);

  const validate = (): boolean => {
    const e: Errors = {};
    if (!formData.name.trim()) e.name = 'Name is required';
    if (!formData.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Invalid email';
    if (!formData.password) e.password = 'Password is required';
    else if (strength.score < 4) e.password = 'Password too weak';
    if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!formData.terms) e.terms = 'You must accept the terms';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setErrors({});
    try {
      const data = await registerMutation.mutateAsync({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        inviteCode: formData.inviteCode,
      });
      if (data.session?.token) {
        // Server set HttpOnly auth cookie via Set-Cookie. Nothing to store client-side.
        toast({ title: 'Account created!', description: 'Welcome aboard.', status: 'success', duration: 3000, isClosable: true });
        // Hard navigation so the destination is server-rendered with the new
        // HttpOnly cookie (a client SPA navigate races the auth-state cache).
        window.location.assign(features?.orgs !== false ? '/orgs/new?onboarding=true' : '/dashboard');
      } else {
        throw new Error('No session token received');
      }
    } catch (err: any) {
      const message = err?.message || 'Registration failed';
      setErrors({ email: message });
      toast({ title: 'Registration failed', description: message, status: 'error', duration: 3000, isClosable: true });
    }
  };

  const inputClass = (id: keyof FormData) =>
    `w-full rounded-lg border bg-surface text-text-strong placeholder:text-text-muted
      px-3.5 py-2.5 text-sm outline-none transition-all
      focus:ring-2 focus:ring-primary/20
      ${errors[id] ? 'border-red-400 focus:border-red-500' : 'border-surface-border focus:border-primary'}`;

  return (
    <div className="rounded-xl border border-surface-border bg-auth-card p-8 shadow-md">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-text-strong mb-1">Create your account</h1>
        <p className="text-sm text-text-muted">Get started in seconds</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="reg-name" className="block text-sm font-medium text-text mb-1.5">Full name</label>
          <input id="reg-name" type="text" autoComplete="name" placeholder="Jane Smith"
            value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={inputClass('name')} />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="reg-email" className="block text-sm font-medium text-text mb-1.5">Email</label>
          <input id="reg-email" type="email" autoComplete="email" placeholder="you@example.com"
            value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className={inputClass('email')} />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="reg-password" className="block text-sm font-medium text-text mb-1.5">Password</label>
          <div className="relative">
            <input id="reg-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password"
              placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;" value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={`${inputClass('password')} pr-10`} />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
              aria-label="Toggle password visibility">
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          {formData.password && <StrengthBar score={strength.score} />}
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
          {formData.password && strength.hints.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {strength.hints.map((h, i) => (
                <li key={i} className="text-xs text-text-muted">&middot; {h}</li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label htmlFor="reg-confirm" className="block text-sm font-medium text-text mb-1.5">Confirm password</label>
          <div className="relative">
            <input id="reg-confirm" type={showConfirm ? 'text' : 'password'} autoComplete="new-password"
              placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;" value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className={`${inputClass('confirmPassword')} pr-10`} />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
              aria-label="Toggle confirm password visibility">
              {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>}
        </div>

        <div>
          <label htmlFor="reg-invite" className="block text-sm font-medium text-text mb-1.5">Invite code</label>
          <input id="reg-invite" type="text" placeholder="XXXXXXXX"
            value={formData.inviteCode} onChange={(e) => setFormData({ ...formData, inviteCode: e.target.value })}
            className={inputClass('inviteCode')} />
          {errors.inviteCode && <p className="mt-1 text-xs text-red-600">{errors.inviteCode}</p>}
        </div>

        <div>
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={formData.terms}
              onChange={(e) => setFormData({ ...formData, terms: e.target.checked })}
              className="mt-0.5 w-4 h-4 rounded border-surface-border accent-primary cursor-pointer flex-shrink-0" />
            <span className="text-sm text-text">
              I agree to the{' '}
              <Link to="/terms" className="text-primary hover:text-primary-dark transition-colors">
                Terms and Conditions
              </Link>
            </span>
          </label>
          {errors.terms && <p className="mt-1 text-xs text-red-600 pl-6">{errors.terms}</p>}
        </div>

        <button type="submit" disabled={registerMutation.isPending}
          className="w-full py-2.5 px-4 rounded-lg bg-primary hover:bg-primary-dark active:bg-primary-dark
            text-white text-sm font-medium transition-colors mt-2
            disabled:opacity-60 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2">
          {registerMutation.isPending ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-muted">
        Already have an account?{' '}
        <Link to="/auth/login" className="text-primary hover:text-primary-dark font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
};

export { RegisterForm };
