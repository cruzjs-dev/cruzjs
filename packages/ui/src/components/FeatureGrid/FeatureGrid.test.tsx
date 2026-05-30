import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FeatureGrid } from './FeatureGrid';
import type { FeatureItem } from './FeatureGrid';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const basicFeatures: FeatureItem[] = [
  {
    id: 'fast',
    title: 'Lightning Fast',
    description: 'Built for speed with edge-first architecture.',
  },
  {
    id: 'secure',
    title: 'Enterprise Security',
    description: 'SOC2 compliant with end-to-end encryption.',
  },
  {
    id: 'scale',
    title: 'Infinite Scale',
    description: 'Auto-scales to millions of requests per second.',
  },
];

const featuresWithIcons: FeatureItem[] = [
  {
    id: 'fast',
    icon: <span data-testid="icon-fast">Z</span>,
    title: 'Lightning Fast',
    description: 'Built for speed.',
  },
  {
    id: 'secure',
    icon: <span data-testid="icon-secure">S</span>,
    title: 'Enterprise Security',
    description: 'SOC2 compliant.',
  },
  {
    id: 'scale',
    icon: <span data-testid="icon-scale">I</span>,
    title: 'Infinite Scale',
    description: 'Auto-scales.',
  },
];

const featuresWithLinks: FeatureItem[] = [
  {
    id: 'fast',
    title: 'Lightning Fast',
    description: 'Built for speed.',
    href: '/features/speed',
    linkLabel: 'Learn more',
  },
  {
    id: 'secure',
    title: 'Enterprise Security',
    description: 'SOC2 compliant.',
    href: '/features/security',
    linkLabel: 'Learn more',
  },
];

// ─── Rendering titles ──────────────────────────────────────────────────────

describe('FeatureGrid -- titles', () => {
  it('renders feature titles', () => {
    render(<FeatureGrid features={basicFeatures} />);
    for (const feature of basicFeatures) {
      expect(screen.getByText(feature.title)).toBeInTheDocument();
    }
  });
});

// ─── Rendering descriptions ────────────────────────────────────────────────

describe('FeatureGrid -- descriptions', () => {
  it('renders feature descriptions', () => {
    render(<FeatureGrid features={basicFeatures} />);
    for (const feature of basicFeatures) {
      expect(screen.getByText(feature.description)).toBeInTheDocument();
    }
  });
});

// ─── Icons ─────────────────────────────────────────────────────────────────

describe('FeatureGrid -- icons', () => {
  it('renders icons when provided', () => {
    render(<FeatureGrid features={featuresWithIcons} />);
    expect(screen.getByTestId('icon-fast')).toBeInTheDocument();
    expect(screen.getByTestId('icon-secure')).toBeInTheDocument();
    expect(screen.getByTestId('icon-scale')).toBeInTheDocument();
  });
});

// ─── Heading and description ───────────────────────────────────────────────

describe('FeatureGrid -- heading and description', () => {
  it('renders heading and description when provided', () => {
    render(
      <FeatureGrid
        features={basicFeatures}
        heading="Our Features"
        description="Everything you need to build modern apps."
      />,
    );
    expect(screen.getByText('Our Features')).toBeInTheDocument();
    expect(screen.getByText('Everything you need to build modern apps.')).toBeInTheDocument();
    expect(screen.getByTestId('feature-grid-header')).toBeInTheDocument();
  });

  it('does not render header section when heading and description are absent', () => {
    render(<FeatureGrid features={basicFeatures} />);
    expect(screen.queryByTestId('feature-grid-header')).not.toBeInTheDocument();
  });
});

// ─── Grid columns ──────────────────────────────────────────────────────────

describe('FeatureGrid -- grid columns', () => {
  it('applies 2-column grid class', () => {
    render(<FeatureGrid features={basicFeatures} columns={2} />);
    const grid = screen.getByTestId('feature-grid-container');
    expect(grid.className).toContain('sm:grid-cols-2');
    expect(grid.className).not.toContain('lg:grid-cols-3');
  });

  it('applies 3-column grid class (default)', () => {
    render(<FeatureGrid features={basicFeatures} />);
    const grid = screen.getByTestId('feature-grid-container');
    expect(grid.className).toContain('sm:grid-cols-2');
    expect(grid.className).toContain('lg:grid-cols-3');
  });

  it('applies 4-column grid class', () => {
    render(<FeatureGrid features={basicFeatures} columns={4} />);
    const grid = screen.getByTestId('feature-grid-container');
    expect(grid.className).toContain('lg:grid-cols-4');
  });
});

// ─── Variant styles ────────────────────────────────────────────────────────

describe('FeatureGrid -- variants', () => {
  it('applies flat variant classes (default)', () => {
    const { container } = render(
      <FeatureGrid features={[basicFeatures[0]]} variant="flat" />,
    );
    const grid = screen.getByTestId('feature-grid-container');
    const card = grid.firstElementChild;
    expect(card?.className).toContain('bg-surface');
    expect(card?.className).toContain('rounded-xl');
    expect(card?.className).not.toContain('border');
    expect(card?.className).not.toContain('shadow-[');
  });

  it('applies outlined variant classes', () => {
    render(<FeatureGrid features={[basicFeatures[0]]} variant="outlined" />);
    const grid = screen.getByTestId('feature-grid-container');
    const card = grid.firstElementChild;
    expect(card?.className).toContain('border');
    expect(card?.className).toContain('border-surface-border');
  });

  it('applies elevated variant classes', () => {
    render(<FeatureGrid features={[basicFeatures[0]]} variant="elevated" />);
    const grid = screen.getByTestId('feature-grid-container');
    const card = grid.firstElementChild;
    expect(card?.className).toContain('shadow-[');
  });
});

// ─── Icon placement ────────────────────────────────────────────────────────

describe('FeatureGrid -- icon placement', () => {
  it('renders icon on top by default (no flex on card)', () => {
    render(
      <FeatureGrid features={featuresWithIcons} iconPlacement="top" />,
    );
    const grid = screen.getByTestId('feature-grid-container');
    const card = grid.firstElementChild;
    // top placement: card should NOT have flex layout for side-by-side
    expect(card?.className).not.toContain('flex gap-4');
  });

  it('renders icon on left with flex layout', () => {
    render(
      <FeatureGrid features={featuresWithIcons} iconPlacement="left" />,
    );
    const grid = screen.getByTestId('feature-grid-container');
    const card = grid.firstElementChild;
    expect(card?.className).toContain('flex');
    expect(card?.className).toContain('gap-4');
  });
});

// ─── Link rendering ────────────────────────────────────────────────────────

describe('FeatureGrid -- links', () => {
  it('renders link labels as anchors', () => {
    render(<FeatureGrid features={featuresWithLinks} />);
    const links = screen.getAllByText('Learn more');
    expect(links).toHaveLength(2);
    const anchor = links[0].closest('a');
    expect(anchor).toHaveAttribute('href', '/features/speed');
  });
});

// ─── Custom className ──────────────────────────────────────────────────────

describe('FeatureGrid -- className', () => {
  it('supports custom className', () => {
    const { container } = render(
      <FeatureGrid features={basicFeatures} className="custom-class" />,
    );
    expect(container.firstElementChild).toHaveClass('custom-class');
  });
});

// ─── renderLink callback ───────────────────────────────────────────────────

describe('FeatureGrid -- renderLink callback', () => {
  it('calls renderLink for feature link labels', () => {
    const renderLink = vi.fn(({ href, children, className }) => (
      <a href={href} className={className} data-testid="custom-link">
        {children}
      </a>
    ));

    render(
      <FeatureGrid features={featuresWithLinks} renderLink={renderLink} />,
    );

    expect(renderLink).toHaveBeenCalledTimes(2);
    expect(screen.getAllByTestId('custom-link')).toHaveLength(2);
  });

  it('calls renderLink for card-level links (href without linkLabel)', () => {
    const cardLinkFeatures: FeatureItem[] = [
      {
        id: 'card-link',
        title: 'Clickable Card',
        description: 'This entire card is a link.',
        href: '/features/card',
      },
    ];

    const renderLink = vi.fn(({ href, children, className }) => (
      <a href={href} className={className} data-testid="card-link">
        {children}
      </a>
    ));

    render(
      <FeatureGrid features={cardLinkFeatures} renderLink={renderLink} />,
    );

    expect(renderLink).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('card-link')).toBeInTheDocument();
  });
});

// ─── Ref forwarding ────────────────────────────────────────────────────────

describe('FeatureGrid -- ref forwarding', () => {
  it('forwards ref to the root section element', () => {
    const ref = { current: null as HTMLElement | null };
    render(<FeatureGrid ref={ref} features={basicFeatures} />);
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current?.tagName).toBe('SECTION');
  });
});
