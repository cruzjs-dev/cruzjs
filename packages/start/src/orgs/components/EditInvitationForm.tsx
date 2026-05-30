import { OrgRoleValues, type OrgRole } from '@cruzjs/core/database/schema';
import type { InvitationResponse } from '@cruzjs/core/orgs/org.models';
import { getTRPC } from '@cruzjs/core/trpc/client';
import { useState } from 'react';

const roleLabels: Record<OrgRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
};

type EditInvitationFormProps = {
  invitation: InvitationResponse;
  orgId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
};

const inputClasses =
  'w-full rounded-lg border border-surface-border bg-surface px-4 py-2.5 text-text-strong placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors';
const labelClasses = 'block text-sm font-medium text-text-strong mb-1.5';

const EditInvitationForm: React.FC<EditInvitationFormProps> = ({
  invitation,
  orgId,
  onSuccess,
  onCancel,
}) => {
  const trpc = getTRPC();
  const [role, setRole] = useState<OrgRole>(invitation.role);
  const [expiresAt, setExpiresAt] = useState<string>(
    new Date(invitation.expiresAt).toISOString().split('T')[0]
  );
  const [expiresAtTime, setExpiresAtTime] = useState<string>(
    new Date(invitation.expiresAt).toTimeString().slice(0, 5)
  );
  const [error, setError] = useState<string | null>(null);

  const updateInvitationMutation = trpc.invitation.update.useMutation({
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (err: { message?: string }) => {
      setError(err.message || 'Failed to update invitation');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Combine date and time into a single Date object
    const expiresAtDate = new Date(`${expiresAt}T${expiresAtTime}`);

    // Validate that expiration is in the future
    if (expiresAtDate <= new Date()) {
      setError('Expiration date must be in the future');
      return;
    }

    await updateInvitationMutation.mutateAsync({
      invitationId: invitation.id,
      role,
      expiresAt: expiresAtDate.toISOString(),
    });
  };

  const isPending = updateInvitationMutation.isPending;

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-col gap-4">
        <div>
          <label className={labelClasses}>Email</label>
          <input
            type="email"
            value={invitation.email}
            disabled
            className={`${inputClasses} opacity-60 cursor-not-allowed`}
          />
          <p className="mt-1 text-xs text-text-muted">
            Email cannot be changed
          </p>
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

        <div>
          <label className={labelClasses}>
            Expiration Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            disabled={isPending}
            min={new Date().toISOString().split('T')[0]}
            className={`${inputClasses} ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
        </div>

        <div>
          <label className={labelClasses}>
            Expiration Time <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            value={expiresAtTime}
            onChange={(e) => setExpiresAtTime(e.target.value)}
            disabled={isPending}
            className={`${inputClasses} ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
        </div>

        {error && (
          <p className="px-4 text-sm text-red-600">{error}</p>
        )}

        <div className="flex flex-col gap-3 w-full">
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Updating...' : 'Update Invitation'}
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

export { EditInvitationForm };
