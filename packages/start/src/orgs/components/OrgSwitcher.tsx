import { useCurrentOrg, useSwitchOrg, type Organization } from '../org.hooks';
import { useEffect, useRef, useState } from 'react';

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

type OrgSwitcherProps = {
  className?: string;
};

export const OrgSwitcher: React.FC<OrgSwitcherProps> = ({ className }) => {
  const { currentOrg, organizations, loading } = useCurrentOrg();
  const { switchOrg, switching } = useSwitchOrg();
  const hasAttemptedAutoSwitch = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      !loading &&
      organizations.length > 0 &&
      !currentOrg &&
      !switching &&
      !hasAttemptedAutoSwitch.current
    ) {
      hasAttemptedAutoSwitch.current = true;
      switchOrg(organizations[0].id);
    }
  }, [loading, organizations, currentOrg, switchOrg, switching]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close dropdown on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (loading || organizations.length === 0) {
    return null;
  }

  const handleOrgSelect = async (org: Organization) => {
    if (org.id === currentOrg?.id) {
      setIsOpen(false);
      return;
    }
    setIsOpen(false);
    await switchOrg(org.id);
  };

  const displayOrg = currentOrg || organizations[0];

  return (
    <div className={className} ref={dropdownRef}>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          disabled={switching}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-medium text-text-muted hover:bg-surface-light active:bg-surface-lighter transition-colors disabled:opacity-50"
        >
          {switching ? (
            'Switching...'
          ) : (
            <>
              <span
                className="flex h-5 w-5 items-center justify-center rounded-sm text-[9px] font-semibold text-white"
                style={{ backgroundColor: getOrgColor(displayOrg.name || '') }}
              >
                {displayOrg.name?.charAt(0)?.toUpperCase() || 'B'}
              </span>
              <span className="max-w-[100px] truncate text-text-muted text-[13px]">
                {displayOrg.name}
              </span>
              {organizations.length > 1 && (
                <svg
                  className="h-3 w-3 text-text-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              )}
            </>
          )}
        </button>

        {isOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 max-h-[280px] max-w-[240px] overflow-y-auto rounded-lg border border-surface-border bg-surface py-1 shadow-lg">
            {organizations.map((org) => (
              <button
                key={org.id}
                type="button"
                onClick={() => handleOrgSelect(org)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-surface-light transition-colors ${
                  org.isCurrent ? 'bg-primary-subtle' : ''
                }`}
              >
                {org.avatarUrl ? (
                  <img
                    src={org.avatarUrl}
                    alt={org.name}
                    className="h-6 w-6 rounded-sm object-cover"
                  />
                ) : (
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-[10px] font-semibold text-white"
                    style={{
                      backgroundColor: getOrgColor(org.name || ''),
                    }}
                  >
                    {org.name?.charAt(0)?.toUpperCase() || 'B'}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-text-strong">
                    {org.name}
                  </p>
                  <p className="text-[10px] text-text-muted">{org.role}</p>
                </div>
                {org.isCurrent && (
                  <span className="shrink-0 rounded-sm bg-primary-subtle px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    Current
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
