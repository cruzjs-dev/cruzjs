import React, { forwardRef } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

export type PricingFeature = {
  text: string;
  included: boolean;
  tooltip?: string;
};

export type PricingTier = {
  id: string;
  name: string;
  description?: string;
  price: string | number;
  priceUnit?: string;
  originalPrice?: string;
  features: PricingFeature[];
  ctaLabel?: string;
  ctaVariant?: 'solid' | 'outline';
  onSelect?: () => void;
  popular?: boolean;
  badge?: string;
  disabled?: boolean;
  current?: boolean;
};

export type PricingCardsProps = React.HTMLAttributes<HTMLDivElement> & {
  tiers: PricingTier[];
  billingToggle?: {
    monthly: string;
    yearly: string;
    active: 'monthly' | 'yearly';
    onChange: (period: 'monthly' | 'yearly') => void;
    discount?: string;
  };
  columns?: 2 | 3 | 4;
};

// ─── Column class map ───────────────────────────────────────────────────────

const columnClasses: Record<2 | 3 | 4, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

// ─── Icons ──────────────────────────────────────────────────────────────────

const CheckIcon: React.FC = () => (
  <svg
    className="w-4 h-4 text-success shrink-0"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
    data-testid="check-icon"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 8.5L6.5 11.5L12.5 4.5" />
  </svg>
);

const XIcon: React.FC = () => (
  <svg
    className="w-4 h-4 text-text-muted shrink-0"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
    data-testid="x-icon"
  >
    <path strokeLinecap="round" d="M4.5 4.5L11.5 11.5M11.5 4.5L4.5 11.5" />
  </svg>
);

// ─── Feature Item ───────────────────────────────────────────────────────────

const FeatureItem: React.FC<{ feature: PricingFeature }> = ({ feature }) => {
  const content = (
    <li className="flex items-start gap-2.5 py-1">
      {feature.included ? <CheckIcon /> : <XIcon />}
      <span
        className={
          feature.included ? 'text-sm text-text-secondary' : 'text-sm text-text-muted line-through'
        }
      >
        {feature.text}
      </span>
    </li>
  );

  if (feature.tooltip) {
    return (
      <div className="group relative">
        {content}
        <div
          role="tooltip"
          className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-2 py-1 text-xs text-surface bg-text rounded whitespace-nowrap z-10"
        >
          {feature.tooltip}
        </div>
      </div>
    );
  }

  return content;
};

// ─── Tier Card ──────────────────────────────────────────────────────────────

const TierCard: React.FC<{ tier: PricingTier }> = ({ tier }) => {
  const isPopular = tier.popular === true;

  const cardClassName = [
    'bg-surface rounded-2xl p-6 flex flex-col relative',
    isPopular
      ? 'ring-2 ring-primary shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08),0_8px_24px_-4px_rgba(0,0,0,0.06)] scale-[1.02]'
      : 'ring-1 ring-surface-border/50 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.04)]',
  ].join(' ');

  const priceDisplay = typeof tier.price === 'number' ? `$${tier.price}` : tier.price;

  const ctaLabel = tier.current ? 'Current Plan' : (tier.ctaLabel ?? 'Get Started');
  const ctaVariant = tier.ctaVariant ?? 'solid';

  const ctaClassName = tier.current
    ? 'bg-surface-lighter text-text-muted cursor-default w-full rounded-lg py-2.5 font-medium text-sm'
    : tier.disabled
      ? 'bg-surface-lighter text-text-muted cursor-not-allowed w-full rounded-lg py-2.5 font-medium text-sm opacity-50'
      : ctaVariant === 'solid'
        ? 'bg-primary text-surface w-full rounded-lg py-2.5 font-medium text-sm hover:opacity-90 transition-opacity'
        : 'ring-1 ring-surface-border text-text w-full rounded-lg py-2.5 font-medium text-sm hover:bg-surface-lighter transition-colors';

  return (
    <div className={cardClassName} data-testid={`tier-${tier.id}`}>
      {/* Badge */}
      {(tier.badge ?? (isPopular ? 'Most Popular' : null)) && (
        <div className="flex justify-center -mt-9 mb-4">
          <span
            className="bg-primary text-surface text-xs font-semibold rounded-full px-3 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
            data-testid="popular-badge"
          >
            {tier.badge ?? 'Most Popular'}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-text">{tier.name}</h3>
        {tier.description && (
          <p className="text-sm text-text-muted mt-1">{tier.description}</p>
        )}
      </div>

      {/* Price */}
      <div className="mb-6 flex items-baseline gap-2">
        {tier.originalPrice && (
          <span className="text-text-muted line-through text-lg" data-testid="original-price">
            {tier.originalPrice}
          </span>
        )}
        <span className="text-4xl font-bold text-text tracking-tight">{priceDisplay}</span>
        {tier.priceUnit && (
          <span className="text-sm text-text-muted font-normal">{tier.priceUnit}</span>
        )}
      </div>

      {/* Features */}
      <ul className="flex-1 space-y-1 mb-6" role="list">
        {tier.features.map((feature, index) => (
          <FeatureItem key={`${tier.id}-feature-${index}`} feature={feature} />
        ))}
      </ul>

      {/* CTA */}
      <button
        type="button"
        className={ctaClassName}
        onClick={tier.current || tier.disabled ? undefined : tier.onSelect}
        disabled={tier.disabled}
        aria-disabled={tier.current || tier.disabled}
      >
        {ctaLabel}
      </button>
    </div>
  );
};

// ─── Billing Toggle ─────────────────────────────────────────────────────────

type BillingToggleProps = NonNullable<PricingCardsProps['billingToggle']>;

const BillingToggle: React.FC<BillingToggleProps> = ({
  monthly,
  yearly,
  active,
  onChange,
  discount,
}) => (
  <div className="flex items-center justify-center gap-3 mb-8" data-testid="billing-toggle">
    <div className="inline-flex bg-surface-lighter rounded-lg p-1 ring-1 ring-surface-border/50">
      <button
        type="button"
        className={[
          'px-4 py-1.5 text-sm font-medium rounded-md transition-all',
          active === 'monthly'
            ? 'bg-surface text-text shadow-sm'
            : 'text-text-muted hover:text-text',
        ].join(' ')}
        onClick={() => onChange('monthly')}
        aria-pressed={active === 'monthly'}
      >
        {monthly}
      </button>
      <button
        type="button"
        className={[
          'px-4 py-1.5 text-sm font-medium rounded-md transition-all',
          active === 'yearly'
            ? 'bg-surface text-text shadow-sm'
            : 'text-text-muted hover:text-text',
        ].join(' ')}
        onClick={() => onChange('yearly')}
        aria-pressed={active === 'yearly'}
      >
        {yearly}
      </button>
    </div>
    {discount && (
      <span
        className="text-success text-xs font-medium bg-success-subtle rounded-full px-2 py-0.5"
        data-testid="discount-badge"
      >
        {discount}
      </span>
    )}
  </div>
);

// ─── PricingCards ────────────────────────────────────────────────────────────

function defaultColumns(count: number): 2 | 3 | 4 {
  if (count <= 2) return 2;
  if (count === 3) return 3;
  return 4;
}

export const PricingCards = forwardRef<HTMLDivElement, PricingCardsProps>(function PricingCards(
  { tiers, billingToggle, columns, className, ...rest },
  ref,
) {
  const cols = columns ?? defaultColumns(tiers.length);

  return (
    <div ref={ref} className={className} {...rest}>
      {billingToggle && <BillingToggle {...billingToggle} />}
      <div
        className={[
          'grid gap-6 items-start',
          columnClasses[cols],
          // Extra top padding when any tier has a badge (for the negative-margin badge)
          tiers.some((t) => t.popular || t.badge) ? 'pt-4' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {tiers.map((tier) => (
          <TierCard key={tier.id} tier={tier} />
        ))}
      </div>
    </div>
  );
});

PricingCards.displayName = 'PricingCards';
