import React, { forwardRef } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

export type SocialLink = {
  platform: string;
  href: string;
  icon: React.ReactNode;
};

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  avatarSrc?: string;
  bio?: string;
  socialLinks?: SocialLink[];
};

export type TeamGridProps = React.HTMLAttributes<HTMLElement> & {
  members: TeamMember[];
  heading?: React.ReactNode;
  description?: React.ReactNode;
  columns?: 2 | 3 | 4;
};

// ─── Column class map ───────────────────────────────────────────────────────

const columnClasses: Record<2 | 3 | 4, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

// ─── Member Card ────────────────────────────────────────────────────────────

type MemberCardProps = {
  member: TeamMember;
};

const MemberCard: React.FC<MemberCardProps> = ({ member }) => {
  return (
    <div
      className="group bg-surface rounded-xl border border-surface-border p-6 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.12),0_8px_24px_-8px_rgba(0,0,0,0.08)]"
      data-testid={`team-member-${member.id}`}
    >
      {/* Avatar */}
      {member.avatarSrc ? (
        <img
          src={member.avatarSrc}
          alt={member.name}
          className="w-24 h-24 rounded-full mx-auto mb-4 object-cover ring-2 ring-surface-border"
          data-testid={`team-avatar-${member.id}`}
        />
      ) : (
        <div
          className="w-24 h-24 rounded-full mx-auto mb-4 bg-surface-secondary flex items-center justify-center ring-2 ring-surface-border"
          data-testid={`team-avatar-${member.id}`}
          aria-label={member.name}
        >
          <span className="text-2xl font-semibold text-text-secondary">
            {member.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </span>
        </div>
      )}

      {/* Name */}
      <h3 className="text-base font-semibold text-text">{member.name}</h3>

      {/* Role */}
      <p className="text-sm text-primary mt-0.5">{member.role}</p>

      {/* Bio */}
      {member.bio && (
        <p className="text-sm text-text-secondary mt-2 leading-relaxed" data-testid={`team-bio-${member.id}`}>
          {member.bio}
        </p>
      )}

      {/* Social Links */}
      {member.socialLinks && member.socialLinks.length > 0 && (
        <div
          className="flex items-center justify-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          data-testid={`team-socials-${member.id}`}
        >
          {member.socialLinks.map((link) => (
            <a
              key={link.platform}
              href={link.href}
              className="inline-flex items-center justify-center w-8 h-8 rounded-full text-text-muted hover:text-primary transition-colors duration-150"
              aria-label={`${member.name} on ${link.platform}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {link.icon}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── TeamGrid ───────────────────────────────────────────────────────────────

export const TeamGrid = forwardRef<HTMLElement, TeamGridProps>(function TeamGrid(
  { members, heading, description, columns = 3, className, ...rest },
  ref,
) {
  return (
    <section
      ref={ref}
      className={['team-grid', className].filter(Boolean).join(' ')}
      {...rest}
    >
      {(heading || description) && (
        <div className="text-center mb-10" data-testid="team-grid-header">
          {heading && (
            <h2 className="text-2xl font-bold text-text sm:text-3xl">{heading}</h2>
          )}
          {description && (
            <p className="text-text-secondary mt-3 max-w-2xl mx-auto text-base leading-relaxed">
              {description}
            </p>
          )}
        </div>
      )}
      <div
        className={['grid gap-6', columnClasses[columns]].filter(Boolean).join(' ')}
        data-testid="team-grid-container"
      >
        {members.map((member) => (
          <MemberCard key={member.id} member={member} />
        ))}
      </div>
    </section>
  );
});

TeamGrid.displayName = 'TeamGrid';
