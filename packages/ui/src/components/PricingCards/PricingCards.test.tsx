import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PricingCards } from './PricingCards';
import type { PricingTier } from './PricingCards';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const baseTiers: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'For individuals',
    price: '$0',
    priceUnit: '/mo',
    features: [
      { text: '1 project', included: true },
      { text: 'Basic support', included: true },
      { text: 'Advanced analytics', included: false },
    ],
    ctaLabel: 'Get Started',
    ctaVariant: 'outline',
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For teams',
    price: 29,
    priceUnit: '/mo',
    features: [
      { text: 'Unlimited projects', included: true },
      { text: 'Priority support', included: true },
      { text: 'Advanced analytics', included: true },
    ],
    ctaLabel: 'Upgrade',
    ctaVariant: 'solid',
    popular: true,
    badge: 'Most Popular',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large teams',
    price: 'Custom',
    features: [
      { text: 'Everything in Pro', included: true },
      { text: 'Dedicated support', included: true },
      { text: 'Custom integrations', included: true },
    ],
    ctaLabel: 'Contact Sales',
    ctaVariant: 'outline',
  },
];

// ─── Tier name rendering ────────────────────────────────────────────────────

describe('PricingCards -- tier names', () => {
  it('renders all tier names', () => {
    render(<PricingCards tiers={baseTiers} />);
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
  });
});

// ─── Price rendering ────────────────────────────────────────────────────────

describe('PricingCards -- prices', () => {
  it('renders string prices as-is', () => {
    render(<PricingCards tiers={baseTiers} />);
    expect(screen.getByText('$0')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('renders numeric prices with $ prefix', () => {
    render(<PricingCards tiers={baseTiers} />);
    expect(screen.getByText('$29')).toBeInTheDocument();
  });

  it('renders price unit', () => {
    render(<PricingCards tiers={baseTiers} />);
    const units = screen.getAllByText('/mo');
    expect(units.length).toBe(2);
  });
});

// ─── Feature rendering ─────────────────────────────────────────────────────

describe('PricingCards -- features', () => {
  it('renders features with check icons for included items', () => {
    render(<PricingCards tiers={baseTiers} />);
    const checkIcons = screen.getAllByTestId('check-icon');
    // 2 included in free + 3 in pro + 3 in enterprise = 8
    expect(checkIcons.length).toBe(8);
  });

  it('renders features with x icons for excluded items', () => {
    render(<PricingCards tiers={baseTiers} />);
    const xIcons = screen.getAllByTestId('x-icon');
    // 1 excluded in free tier
    expect(xIcons.length).toBe(1);
  });

  it('applies line-through to excluded feature text', () => {
    render(<PricingCards tiers={baseTiers} />);
    const excludedText = screen.getByText('Advanced analytics', {
      selector: '.line-through',
    });
    expect(excludedText).toBeInTheDocument();
  });
});

// ─── CTA buttons ────────────────────────────────────────────────────────────

describe('PricingCards -- CTA buttons', () => {
  it('renders CTA buttons with custom labels', () => {
    render(<PricingCards tiers={baseTiers} />);
    expect(screen.getByText('Get Started')).toBeInTheDocument();
    expect(screen.getByText('Upgrade')).toBeInTheDocument();
    expect(screen.getByText('Contact Sales')).toBeInTheDocument();
  });

  it('calls onSelect when CTA is clicked', () => {
    const onSelect = vi.fn();
    const tiers: PricingTier[] = [
      {
        id: 'test',
        name: 'Test',
        price: '$10',
        features: [],
        onSelect,
      },
    ];
    render(<PricingCards tiers={tiers} />);
    fireEvent.click(screen.getByText('Get Started'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('does not call onSelect when disabled', () => {
    const onSelect = vi.fn();
    const tiers: PricingTier[] = [
      {
        id: 'test',
        name: 'Test',
        price: '$10',
        features: [],
        onSelect,
        disabled: true,
      },
    ];
    render(<PricingCards tiers={tiers} />);
    fireEvent.click(screen.getByText('Get Started'));
    expect(onSelect).not.toHaveBeenCalled();
  });
});

// ─── Popular badge ──────────────────────────────────────────────────────────

describe('PricingCards -- popular badge', () => {
  it('shows popular badge on marked tier', () => {
    render(<PricingCards tiers={baseTiers} />);
    const badges = screen.getAllByTestId('popular-badge');
    expect(badges.length).toBe(1);
    expect(badges[0]).toHaveTextContent('Most Popular');
  });

  it('uses custom badge text when provided', () => {
    const tiers: PricingTier[] = [
      {
        id: 'custom',
        name: 'Custom',
        price: '$5',
        features: [],
        badge: 'Best Value',
      },
    ];
    render(<PricingCards tiers={tiers} />);
    expect(screen.getByText('Best Value')).toBeInTheDocument();
  });
});

// ─── Billing toggle ─────────────────────────────────────────────────────────

describe('PricingCards -- billing toggle', () => {
  it('renders billing toggle when provided', () => {
    render(
      <PricingCards
        tiers={baseTiers}
        billingToggle={{
          monthly: 'Monthly',
          yearly: 'Yearly',
          active: 'monthly',
          onChange: vi.fn(),
        }}
      />,
    );
    expect(screen.getByTestId('billing-toggle')).toBeInTheDocument();
    expect(screen.getByText('Monthly')).toBeInTheDocument();
    expect(screen.getByText('Yearly')).toBeInTheDocument();
  });

  it('calls onChange when toggling billing period', () => {
    const onChange = vi.fn();
    render(
      <PricingCards
        tiers={baseTiers}
        billingToggle={{
          monthly: 'Monthly',
          yearly: 'Yearly',
          active: 'monthly',
          onChange,
        }}
      />,
    );
    fireEvent.click(screen.getByText('Yearly'));
    expect(onChange).toHaveBeenCalledWith('yearly');
  });

  it('shows discount badge when provided', () => {
    render(
      <PricingCards
        tiers={baseTiers}
        billingToggle={{
          monthly: 'Monthly',
          yearly: 'Yearly',
          active: 'yearly',
          onChange: vi.fn(),
          discount: 'Save 20%',
        }}
      />,
    );
    expect(screen.getByTestId('discount-badge')).toBeInTheDocument();
    expect(screen.getByText('Save 20%')).toBeInTheDocument();
  });
});

// ─── Current plan ───────────────────────────────────────────────────────────

describe('PricingCards -- current plan', () => {
  it('renders current plan state with disabled CTA', () => {
    const onSelect = vi.fn();
    const tiers: PricingTier[] = [
      {
        id: 'current',
        name: 'Current',
        price: '$10',
        features: [],
        current: true,
        onSelect,
      },
    ];
    render(<PricingCards tiers={tiers} />);
    const button = screen.getByText('Current Plan');
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(onSelect).not.toHaveBeenCalled();
  });
});

// ─── Original price strikethrough ───────────────────────────────────────────

describe('PricingCards -- original price', () => {
  it('renders original price with strikethrough', () => {
    const tiers: PricingTier[] = [
      {
        id: 'discount',
        name: 'Discounted',
        price: '$19',
        originalPrice: '$29',
        features: [],
      },
    ];
    render(<PricingCards tiers={tiers} />);
    const original = screen.getByTestId('original-price');
    expect(original).toHaveTextContent('$29');
    expect(original.className).toContain('line-through');
  });
});

// ─── Ref forwarding ─────────────────────────────────────────────────────────

describe('PricingCards -- ref forwarding', () => {
  it('forwards ref to the root element', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<PricingCards ref={ref} tiers={baseTiers} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
