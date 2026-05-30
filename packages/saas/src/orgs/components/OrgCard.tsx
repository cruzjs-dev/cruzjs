import { useNavigate } from 'react-router';

/**
 * Generate a consistent color from an org name using a hash function.
 * Same name always produces the same color.
 */
const ORG_COLORS = [
  'var(--color-primary-dark)',
  'var(--color-primary)',
  'var(--color-accent)',
  'var(--color-info)',
] as const;

function getOrgColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ORG_COLORS[Math.abs(hash) % ORG_COLORS.length];
}

type OrganizationResponse = {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  settings: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

type OrgCardProps = {
  organization: OrganizationResponse;
  memberCount?: number;
  subscriptionStatus?: 'active' | 'trial' | 'expired' | 'cancelled';
};

const OrgCard: React.FC<OrgCardProps> = ({
  organization,
  memberCount,
  subscriptionStatus = 'trial',
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/orgs/${organization.slug}`);
  };

  const getStatusStyles = () => {
    switch (subscriptionStatus) {
      case 'active':
        return 'bg-emerald-50 text-emerald-600';
      case 'trial':
        return 'bg-primary-subtle text-primary';
      case 'expired':
        return 'bg-red-50 text-red-600';
      case 'cancelled':
        return 'bg-surface-light text-text-muted';
      default:
        return 'bg-primary-subtle text-primary';
    }
  };

  return (
    <button
      onClick={handleClick}
      className="group relative w-full text-left overflow-hidden rounded-lg bg-surface border border-surface-border p-4 transition-all duration-150 hover:border-primary-light/40 cursor-pointer"
    >
      <div className="relative">
        <div className="flex items-start gap-3 mb-3">
          {/* Avatar */}
          {organization.avatarUrl ? (
            <img
              src={organization.avatarUrl}
              alt={organization.name}
              className="w-9 h-9 rounded-lg object-cover"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-semibold text-[13px] transition-all"
              style={{ backgroundColor: getOrgColor(organization.name || '') }}
            >
              {organization.name?.charAt(0)?.toUpperCase() || 'B'}
            </div>
          )}

          {/* Badge */}
          <div className="ml-auto">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusStyles()}`}>
              {subscriptionStatus.charAt(0).toUpperCase() + subscriptionStatus.slice(1)}
            </span>
          </div>
        </div>

        {/* Info */}
        <div>
          <h3 className="text-[14px] font-medium text-text-strong truncate mb-0.5 group-hover:text-primary transition-colors">
            {organization.name}
          </h3>
          <p className="text-[11px] font-mono text-text-muted truncate">
            /{organization.slug}
          </p>
        </div>

        {/* Footer */}
        {memberCount !== undefined && (
          <div className="flex items-center gap-1.5 pt-3 mt-3 border-t border-surface-border">
            <span className="text-[11px] text-text-muted">
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </span>
          </div>
        )}
      </div>
    </button>
  );
};

export { OrgCard };
