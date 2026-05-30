import { OrgRoleValues, type OrgRole } from '@cruzjs/core/database/schema';
import { getTRPC } from '@cruzjs/core/trpc/client';
import { useState } from 'react';

type InvitationFormProps = {
  orgId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
};

const roleLabels: Record<OrgRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
};

const inputClasses =
  'w-full rounded-lg border border-surface-border bg-surface px-4 py-2.5 text-text-strong placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors';
const labelClasses = 'block text-sm font-medium text-text-strong mb-1.5';

const InvitationForm: React.FC<InvitationFormProps> = ({
  orgId,
  onSuccess,
  onCancel,
}) => {
  const trpc = getTRPC();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgRole>('MEMBER');
  const [error, setError] = useState<string | null>(null);

  const createInvitationMutation = trpc.invitation.create.useMutation({
    onSuccess: () => {
      setEmail('');
      setRole('MEMBER');
      onSuccess?.();
    },
    onError: (err: { message?: string }) => {
      setError(err.message || 'Failed to send invitation');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    await createInvitationMutation.mutateAsync({
      email: email.trim(),
      role,
    });
  };

  const isPending = createInvitationMutation.isPending;

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-col gap-4">
        <div>
          <label className={labelClasses}>
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending}
            className={`${inputClasses} ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
        </div>

        <div>
          <label className={labelClasses}>Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as OrgRole)}
            disabled={isPending}
            className={`${inputClasses} ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {OrgRoleValues.map((roleValue) => (
              <option key={roleValue} value={roleValue}>
                {roleLabels[roleValue]}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="px-4 text-sm text-red-600">{error}</p>
        )}

        <div className="flex flex-col gap-3 w-full">
          <button
            type="submit"
            disabled={!email.trim() || isPending}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Sending...' : 'Send Invitation'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isPending}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-text hover:bg-surface-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </form>
  );
};

export { InvitationForm };
