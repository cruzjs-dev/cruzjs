import React, { forwardRef } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

export type FeatureItem = {
  id: string;
  icon?: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  linkLabel?: string;
};

export type FeatureGridVariant = 'flat' | 'outlined' | 'elevated';
export type FeatureGridIconPlacement = 'top' | 'left';

export type FeatureGridProps = React.HTMLAttributes<HTMLElement> & {
  features: FeatureItem[];
  heading?: React.ReactNode;
  description?: React.ReactNode;
  columns?: 2 | 3 | 4;
  variant?: FeatureGridVariant;
  iconPlacement?: FeatureGridIconPlacement;
  renderLink?: (props: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => React.ReactNode;
};

// ─── Column class map ───────────────────────────────────────────────────────

const columnClasses: Record<2 | 3 | 4, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

// ─── Variant styles ─────────────────────────────────────────────────────────

const variantCardStyles: Record<FeatureGridVariant, string> = {
  flat: 'bg-surface rounded-xl p-6',
  outlined: 'bg-surface rounded-xl p-6 border border-surface-border',
  elevated:
    'bg-surface rounded-xl p-6 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_4px_16px_-4px_rgba(0,0,0,0.06)]',
};

// ─── Icon container style ───────────────────────────────────────────────────

const iconContainerStyle: React.CSSProperties = {
  backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))',
};

// ─── Arrow icon ─────────────────────────────────────────────────────────────

const ArrowRightIcon: React.FC = () => (
  <svg
    className="w-4 h-4 ml-1 inline-block transition-transform group-hover:translate-x-0.5"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 8h9m-4.5 4.5L12.5 8 8 3.5" />
  </svg>
);

// ─── Feature Card ───────────────────────────────────────────────────────────

type FeatureCardProps = {
  feature: FeatureItem;
  variant: FeatureGridVariant;
  iconPlacement: FeatureGridIconPlacement;
  renderLink?: FeatureGridProps['renderLink'];
};

const FeatureCard: React.FC<FeatureCardProps> = ({
  feature,
  variant,
  iconPlacement,
  renderLink,
}) => {
  const isClickable = !!feature.href;

  const cardClassName = [
    variantCardStyles[variant],
    'transition-all duration-200',
    isClickable ? 'hover:-translate-y-1 hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.12),0_8px_24px_-8px_rgba(0,0,0,0.08)] cursor-pointer' : '',
    iconPlacement === 'left' ? 'flex gap-4' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const iconElement = feature.icon ? (
    <div
      className={[
        'flex items-center justify-center rounded-lg shrink-0',
        iconPlacement === 'top' ? 'w-12 h-12 mb-4' : 'w-10 h-10 mt-0.5',
      ].join(' ')}
      style={iconContainerStyle}
      data-testid={`feature-icon-${feature.id}`}
    >
      <span className="text-primary">{feature.icon}</span>
    </div>
  ) : null;

  const linkElement =
    feature.href && feature.linkLabel ? (
      <div className="mt-3">
        {renderLink ? (
          renderLink({
            href: feature.href,
            children: (
              <span className="group inline-flex items-center text-sm font-medium text-primary hover:opacity-80 transition-opacity">
                {feature.linkLabel}
                <ArrowRightIcon />
              </span>
            ),
            className: 'feature-grid-link',
          })
        ) : (
          <a
            href={feature.href}
            className="group inline-flex items-center text-sm font-medium text-primary hover:opacity-80 transition-opacity"
          >
            {feature.linkLabel}
            <ArrowRightIcon />
          </a>
        )}
      </div>
    ) : null;

  const content =
    iconPlacement === 'left' ? (
      <>
        {iconElement}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-text">{feature.title}</h3>
          <p className="text-sm text-text-secondary mt-1 leading-relaxed">
            {feature.description}
          </p>
          {linkElement}
        </div>
      </>
    ) : (
      <>
        {iconElement}
        <h3 className="text-base font-semibold text-text">{feature.title}</h3>
        <p className="text-sm text-text-secondary mt-1 leading-relaxed">
          {feature.description}
        </p>
        {linkElement}
      </>
    );

  if (isClickable && feature.href && !feature.linkLabel) {
    if (renderLink) {
      return <>{renderLink({ href: feature.href, children: content, className: cardClassName })}</>;
    }
    return (
      <a href={feature.href} className={cardClassName}>
        {content}
      </a>
    );
  }

  return <div className={cardClassName}>{content}</div>;
};

// ─── FeatureGrid ────────────────────────────────────────────────────────────

export const FeatureGrid = forwardRef<HTMLElement, FeatureGridProps>(function FeatureGrid(
  {
    features,
    heading,
    description,
    columns = 3,
    variant = 'flat',
    iconPlacement = 'top',
    renderLink,
    className,
    ...rest
  },
  ref,
) {
  return (
    <section
      ref={ref}
      className={['feature-grid', className].filter(Boolean).join(' ')}
      {...rest}
    >
      {(heading || description) && (
        <div className="text-center mb-10" data-testid="feature-grid-header">
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
        data-testid="feature-grid-container"
      >
        {features.map((feature) => (
          <FeatureCard
            key={feature.id}
            feature={feature}
            variant={variant}
            iconPlacement={iconPlacement}
            renderLink={renderLink}
          />
        ))}
      </div>
    </section>
  );
});

FeatureGrid.displayName = 'FeatureGrid';
