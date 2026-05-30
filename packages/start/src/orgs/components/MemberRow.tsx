import type { OrgRole } from '@cruzjs/core/database/schema';
import type { MemberResponse } from '@cruzjs/core/orgs/org.models';

type MemberRowProps = {
  member: MemberResponse;
  currentUserRole: OrgRole;
  currentUserId: string;
  onRoleChange: (member: MemberResponse) => void;
  onRemove: (member: MemberResponse) => void;
};

const roleLabels: Record<OrgRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
};

const roleBadgeClasses: Record<OrgRole, string> = {
  OWNER: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-blue-100 text-blue-700',
  MEMBER: 'bg-emerald-100 text-emerald-700',
  VIEWER: 'bg-surface-light text-text-muted',
};

const MemberRow: React.FC<MemberRowProps> = ({
  member,
  currentUserRole,
  currentUserId,
  onRoleChange,
  onRemove,
}) => {
  const canManageMembers =
    currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';
  const isCurrentUser = member.userId === currentUserId;
  const canChangeRole =
    canManageMembers &&
    (member.role !== 'OWNER' || currentUserRole === 'OWNER');
  const canRemove =
    canManageMembers && !isCurrentUser && member.role !== 'OWNER';

  return (
    <div className="flex items-center justify-between p-4 border-b border-surface-border">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {member.user.avatarUrl ? (
          <img
            src={member.user.avatarUrl}
            alt={member.user.name || member.user.email}
            className="w-10 h-10 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold shrink-0">
            {(member.user.name || member.user.email).charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <span className="font-medium text-text-strong truncate">
            {member.user.name || member.user.email}
          </span>
          <span className="text-sm text-text-muted truncate">
            {member.user.email}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleBadgeClasses[member.role]}`}
        >
          {roleLabels[member.role]}
        </span>
        {canChangeRole && (
          <button
            type="button"
            className="px-3 py-1.5 text-sm font-medium rounded-md border border-surface-border bg-surface text-text hover:bg-surface-light transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onRoleChange(member);
            }}
          >
            Change Role
          </button>
        )}
        {canRemove && (
          <button
            type="button"
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(member);
            }}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
};

export { MemberRow };
