import React, { forwardRef } from 'react';
import { Avatar } from '../Avatar';

export type ProfileCardVariant = 'compact' | 'detailed' | 'horizontal';

export type ProfileCardStat = {
  label: string;
  value: string | number;
};

export type ProfileCardAction = {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: 'solid' | 'outline' | 'ghost';
};

export type ProfileCardSocialLink = {
  icon: React.ReactNode;
  href: string;
  label: string;
};

export type ProfileCardProps = React.HTMLAttributes<HTMLDivElement> & {
  name: string;
  role?: string;
  bio?: string;
  avatarSrc?: string;
  coverSrc?: string;
  stats?: ProfileCardStat[];
  actions?: ProfileCardAction[];
  socialLinks?: ProfileCardSocialLink[];
  variant?: ProfileCardVariant;
  status?: 'online' | 'offline' | 'away' | 'busy';
  badge?: React.ReactNode;
};

const actionVariantStyles: Record<NonNullable<ProfileCardAction['variant']>, string> = {
  solid: 'bg-primary text-surface rounded-lg px-4 py-2 font-medium text-sm hover:bg-primary-dark transition-colors',
  outline: 'ring-1 ring-surface-border text-text-secondary rounded-lg px-4 py-2 font-medium text-sm hover:bg-surface-lighter transition-colors',
  ghost: 'text-text-secondary rounded-lg px-4 py-2 font-medium text-sm hover:bg-surface-lighter transition-colors',
};

function StatsRow({ stats }: { stats: ProfileCardStat[] }) {
  return (
    <div className="flex gap-6 justify-center">
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col items-center">
          <span className="font-semibold text-text">{stat.value}</span>
          <span className="text-xs text-text-tertiary">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}

function ActionsRow({ actions }: { actions: ProfileCardAction[] }) {
  return (
    <div className="flex gap-2 justify-center">
      {actions.map((action) => {
        const classes = actionVariantStyles[action.variant ?? 'solid'];
        if (action.href) {
          return (
            <a key={action.label} href={action.href} className={classes}>
              {action.label}
            </a>
          );
        }
        return (
          <button key={action.label} type="button" onClick={action.onClick} className={classes}>
            {action.label}
          </button>
        );
      })}
    </div>
  );
}

function SocialLinksRow({ links }: { links: ProfileCardSocialLink[] }) {
  return (
    <div className="flex gap-2 justify-center">
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          aria-label={link.label}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:text-text-secondary transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          {link.icon}
        </a>
      ))}
    </div>
  );
}

function CompactVariant({
  name,
  role,
  avatarSrc,
  stats,
  actions,
  status,
  badge,
}: ProfileCardProps) {
  return (
    <>
      {badge && (
        <div className="absolute top-3 right-3 z-10">{badge}</div>
      )}
      <div className="flex flex-col items-center gap-3 p-5">
        <Avatar src={avatarSrc} name={name} size="lg" status={status} />
        <div className="text-center">
          <p className="text-sm font-semibold text-text-strong">{name}</p>
          {role && <p className="text-xs text-text-tertiary mt-0.5">{role}</p>}
        </div>
        {stats && stats.length > 0 && (
          <div className="w-full pt-2 border-t border-surface-border/50">
            <StatsRow stats={stats} />
          </div>
        )}
        {actions && actions.length > 0 && (
          <ActionsRow actions={actions} />
        )}
      </div>
    </>
  );
}

function DetailedVariant({
  name,
  role,
  bio,
  avatarSrc,
  coverSrc,
  stats,
  actions,
  socialLinks,
  status,
  badge,
}: ProfileCardProps) {
  return (
    <>
      <div
        className="h-24 w-full bg-surface-lighter bg-cover bg-center"
        style={coverSrc ? { backgroundImage: `url(${coverSrc})` } : undefined}
      />
      <div className="flex flex-col items-center px-5 pb-5">
        <div className="-mt-8 relative">
          <Avatar src={avatarSrc} name={name} size="xl" status={status} />
        </div>
        <div className="text-center mt-3">
          <div className="flex items-center justify-center gap-2">
            <p className="text-base font-semibold text-text-strong">{name}</p>
            {badge && <span>{badge}</span>}
          </div>
          {role && <p className="text-sm text-text-tertiary mt-0.5">{role}</p>}
          {bio && <p className="text-sm text-text-secondary mt-2 leading-relaxed">{bio}</p>}
        </div>
        {stats && stats.length > 0 && (
          <div className="w-full pt-4 mt-4 border-t border-surface-border/50">
            <StatsRow stats={stats} />
          </div>
        )}
        {actions && actions.length > 0 && (
          <div className="mt-4 w-full">
            <ActionsRow actions={actions} />
          </div>
        )}
        {socialLinks && socialLinks.length > 0 && (
          <div className="mt-3">
            <SocialLinksRow links={socialLinks} />
          </div>
        )}
      </div>
    </>
  );
}

function HorizontalVariant({
  name,
  role,
  avatarSrc,
  stats,
  actions,
  status,
  badge,
}: ProfileCardProps) {
  return (
    <div className="flex items-center gap-4 p-4">
      <Avatar src={avatarSrc} name={name} size="lg" status={status} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-text-strong truncate">{name}</p>
          {badge && <span className="shrink-0">{badge}</span>}
        </div>
        {role && <p className="text-xs text-text-tertiary mt-0.5">{role}</p>}
        {stats && stats.length > 0 && (
          <div className="flex gap-4 mt-1.5">
            {stats.map((stat) => (
              <span key={stat.label} className="text-xs text-text-secondary">
                <span className="font-semibold text-text">{stat.value}</span>{' '}
                <span className="text-text-tertiary">{stat.label}</span>
              </span>
            ))}
          </div>
        )}
      </div>
      {actions && actions.length > 0 && (
        <div className="flex gap-2 shrink-0">
          <ActionsRow actions={actions} />
        </div>
      )}
    </div>
  );
}

export const ProfileCard = forwardRef<HTMLDivElement, ProfileCardProps>(function ProfileCard(
  { variant = 'compact', className, ...props },
  ref,
) {
  const baseClasses = variant === 'compact'
    ? 'w-64 relative bg-surface rounded-xl ring-1 ring-surface-border/50 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.04)] overflow-hidden'
    : variant === 'detailed'
      ? 'bg-surface rounded-xl ring-1 ring-surface-border/50 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.04)] overflow-hidden'
      : 'bg-surface rounded-xl ring-1 ring-surface-border/50 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.04)]';

  return (
    <div
      ref={ref}
      className={[baseClasses, className].filter(Boolean).join(' ')}
      {...extractDivProps(props)}
    >
      {variant === 'compact' && <CompactVariant variant={variant} {...props} />}
      {variant === 'detailed' && <DetailedVariant variant={variant} {...props} />}
      {variant === 'horizontal' && <HorizontalVariant variant={variant} {...props} />}
    </div>
  );
});

ProfileCard.displayName = 'ProfileCard';

/**
 * Extract only valid HTML div attributes from ProfileCardProps,
 * omitting component-specific props.
 */
function extractDivProps(props: Omit<ProfileCardProps, 'variant' | 'className'>): React.HTMLAttributes<HTMLDivElement> {
  const {
    name: _name,
    role: _role,
    bio: _bio,
    avatarSrc: _avatarSrc,
    coverSrc: _coverSrc,
    stats: _stats,
    actions: _actions,
    socialLinks: _socialLinks,
    status: _status,
    badge: _badge,
    ...divProps
  } = props;
  return divProps;
}
