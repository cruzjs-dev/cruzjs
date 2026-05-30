import React, { forwardRef } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

export type JobPosition = {
  id: string;
  title: string;
  department?: string;
  location?: string;
  type?: 'full-time' | 'part-time' | 'contract' | 'internship';
  description?: string;
  href?: string;
};

export type CareerCardsProps = React.HTMLAttributes<HTMLElement> & {
  positions: JobPosition[];
  heading?: React.ReactNode;
  description?: React.ReactNode;
  columns?: 1 | 2 | 3;
  renderLink?: (props: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => React.ReactNode;
};

// ─── Column class map ───────────────────────────────────────────────────────

const columnClasses: Record<1 | 2 | 3, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
};

// ─── Type badge styling ─────────────────────────────────────────────────────

const typeBadgeClasses: Record<NonNullable<JobPosition['type']>, string> = {
  'full-time': 'bg-success-subtle text-success-text',
  'part-time': 'bg-warning-subtle text-warning-text',
  contract: 'bg-info-subtle text-info-text',
  internship: 'bg-primary-subtle text-primary',
};

const typeLabels: Record<NonNullable<JobPosition['type']>, string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
};

// ─── Badges ─────────────────────────────────────────────────────────────────

const PositionBadges: React.FC<{ position: JobPosition }> = ({ position }) => {
  const hasBadges = position.department || position.location || position.type;
  if (!hasBadges) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {position.department && (
        <span
          className="bg-primary-subtle text-primary text-xs font-medium rounded-full px-2.5 py-0.5"
          data-testid="department-badge"
        >
          {position.department}
        </span>
      )}
      {position.location && (
        <span
          className="bg-surface-lighter text-text-secondary text-xs font-medium rounded-full px-2.5 py-0.5"
          data-testid="location-badge"
        >
          {position.location}
        </span>
      )}
      {position.type && (
        <span
          className={`${typeBadgeClasses[position.type]} text-xs font-medium rounded-full px-2.5 py-0.5`}
          data-testid="type-badge"
        >
          {typeLabels[position.type]}
        </span>
      )}
    </div>
  );
};

// ─── Position Card ──────────────────────────────────────────────────────────

const PositionCard: React.FC<{
  position: JobPosition;
  renderLink?: CareerCardsProps['renderLink'];
}> = ({ position, renderLink }) => {
  const cardContent = (
    <div className="p-5">
      <h3 className="text-lg font-semibold text-text leading-snug line-clamp-2">
        {position.title}
      </h3>

      <PositionBadges position={position} />

      {position.description && (
        <p className="text-sm text-text-secondary mt-3 line-clamp-3">
          {position.description}
        </p>
      )}
    </div>
  );

  const cardClassName =
    'bg-surface rounded-xl ring-1 ring-surface-border/50 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:ring-primary/40 hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.1),0_4px_12px_-2px_rgba(0,0,0,0.06)]';

  if (position.href && renderLink) {
    return renderLink({
      href: position.href,
      className: `${cardClassName} block`,
      children: cardContent,
    });
  }

  if (position.href) {
    return (
      <a
        href={position.href}
        className={`${cardClassName} block`}
        data-testid={`position-${position.id}`}
      >
        {cardContent}
      </a>
    );
  }

  return (
    <div className={cardClassName} data-testid={`position-${position.id}`}>
      {cardContent}
    </div>
  );
};

// ─── CareerCards ─────────────────────────────────────────────────────────────

export const CareerCards = forwardRef<HTMLElement, CareerCardsProps>(function CareerCards(
  { positions, heading, description: sectionDescription, columns = 3, renderLink, className, ...rest },
  ref,
) {
  return (
    <section ref={ref} className={className} {...rest}>
      {(heading || sectionDescription) && (
        <div className="mb-8">
          {heading && (
            typeof heading === 'string' ? (
              <h2 className="text-2xl font-bold text-text">{heading}</h2>
            ) : (
              heading
            )
          )}
          {sectionDescription && (
            typeof sectionDescription === 'string' ? (
              <p className="text-text-secondary mt-2">{sectionDescription}</p>
            ) : (
              <div className="mt-2">{sectionDescription}</div>
            )
          )}
        </div>
      )}

      <div className={['grid gap-6', columnClasses[columns]].join(' ')}>
        {positions.map((position) => (
          <PositionCard key={position.id} position={position} renderLink={renderLink} />
        ))}
      </div>
    </section>
  );
});

CareerCards.displayName = 'CareerCards';
