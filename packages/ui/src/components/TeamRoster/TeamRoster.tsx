import React, { forwardRef, useMemo, useState } from 'react';
import { Avatar } from '../Avatar';
import { Spinner } from '../Spinner';

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  avatarSrc?: string;
  role: string;
  status?: 'active' | 'pending' | 'inactive';
  joinedAt?: string;
};

export type TeamRosterProps = React.HTMLAttributes<HTMLDivElement> & {
  members: TeamMember[];
  roles?: string[];
  onRoleChange?: (memberId: string, role: string) => void;
  onRemove?: (memberId: string) => void;
  onInvite?: () => void;
  inviteLabel?: string;
  currentUserId?: string;
  emptyMessage?: string;
  loading?: boolean;
  searchable?: boolean;
};

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
      clipRule="evenodd"
    />
  </svg>
);

const RemoveIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
  </svg>
);

export const TeamRoster = forwardRef<HTMLDivElement, TeamRosterProps>(function TeamRoster(
  {
    members,
    roles,
    onRoleChange,
    onRemove,
    onInvite,
    inviteLabel = 'Invite Member',
    currentUserId,
    emptyMessage = 'No team members yet.',
    loading = false,
    searchable = false,
    className,
    ...rest
  },
  ref,
) {
  const [search, setSearch] = useState('');

  const filteredMembers = useMemo(() => {
    if (!searchable || !search.trim()) return members;
    const q = search.trim().toLowerCase();
    return members.filter(
      (m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
    );
  }, [members, search, searchable]);

  const canChangeRole = Boolean(onRoleChange && roles && roles.length > 0);

  return (
    <div
      ref={ref}
      className={[
        'bg-surface rounded-xl ring-1 ring-surface-border/50 overflow-hidden',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-surface-border/50 flex items-center justify-between">
        <span className="text-sm text-text-secondary">
          {members.length} {members.length === 1 ? 'member' : 'members'}
        </span>
        {onInvite && (
          <button
            type="button"
            onClick={onInvite}
            className="bg-primary text-surface rounded-lg px-3 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {inviteLabel}
          </button>
        )}
      </div>

      {/* Search */}
      {searchable && (
        <div className="px-5 py-3 border-b border-surface-border/50">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-surface-lighter rounded-lg pl-9 pr-3 py-2 text-sm w-full ring-1 ring-surface-border/50 outline-none focus:ring-primary/50 transition-shadow text-text placeholder:text-text-muted"
            />
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Spinner size="md" />
        </div>
      )}

      {/* Empty */}
      {!loading && filteredMembers.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-text-muted">{emptyMessage}</p>
        </div>
      )}

      {/* Member rows */}
      {!loading &&
        filteredMembers.map((member) => (
          <div
            key={member.id}
            className="px-5 py-3 border-b border-surface-border/50 last:border-b-0 hover:bg-surface-lighter/50 transition-colors flex items-center gap-3"
          >
            <Avatar src={member.avatarSrc} name={member.name} size="sm" />

            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-text truncate">{member.name}</p>
              <p className="text-xs text-text-muted truncate">{member.email}</p>
            </div>

            {/* Status */}
            {member.status === 'pending' && (
              <span className="text-warning-text bg-warning-subtle text-[11px] rounded-full px-2 py-0.5 font-medium shrink-0">
                Pending
              </span>
            )}
            {member.status === 'inactive' && (
              <span className="text-text-muted text-[11px] rounded-full px-2 py-0.5 font-medium shrink-0">
                Inactive
              </span>
            )}

            {/* Role */}
            {canChangeRole ? (
              <select
                value={member.role}
                onChange={(e) => onRoleChange?.(member.id, e.target.value)}
                className="bg-surface-lighter text-text-secondary text-xs rounded-full px-2 py-0.5 font-medium border-none outline-none cursor-pointer shrink-0"
                aria-label={`Role for ${member.name}`}
              >
                {roles!.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            ) : (
              <span className="bg-surface-lighter text-text-secondary text-xs rounded-full px-2 py-0.5 font-medium shrink-0">
                {member.role}
              </span>
            )}

            {/* Remove */}
            {onRemove && member.id !== currentUserId && (
              <button
                type="button"
                onClick={() => onRemove(member.id)}
                className="text-text-muted hover:text-danger transition-colors shrink-0 p-0.5"
                aria-label={`Remove ${member.name}`}
              >
                <RemoveIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
    </div>
  );
});

TeamRoster.displayName = 'TeamRoster';
