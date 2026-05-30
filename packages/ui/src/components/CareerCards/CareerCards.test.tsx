import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CareerCards } from './CareerCards';
import type { JobPosition } from './CareerCards';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const basePositions: JobPosition[] = [
  {
    id: 'eng-1',
    title: 'Senior Frontend Engineer',
    department: 'Engineering',
    location: 'Remote',
    type: 'full-time',
    description: 'Build beautiful, performant UIs with React and TypeScript.',
    href: '/careers/senior-frontend-engineer',
  },
  {
    id: 'design-1',
    title: 'Product Designer',
    department: 'Design',
    location: 'San Francisco, CA',
    type: 'part-time',
    description: 'Shape the future of our product experience.',
    href: '/careers/product-designer',
  },
  {
    id: 'ops-1',
    title: 'DevOps Contractor',
    department: 'Infrastructure',
    location: 'New York, NY',
    type: 'contract',
    description: 'Manage CI/CD pipelines and cloud infrastructure.',
    href: '/careers/devops-contractor',
  },
];

// ─── Job titles ─────────────────────────────────────────────────────────────

describe('CareerCards -- job titles', () => {
  it('renders all job titles', () => {
    render(<CareerCards positions={basePositions} />);
    expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument();
    expect(screen.getByText('Product Designer')).toBeInTheDocument();
    expect(screen.getByText('DevOps Contractor')).toBeInTheDocument();
  });
});

// ─── Department badges ──────────────────────────────────────────────────────

describe('CareerCards -- department badges', () => {
  it('renders department badges', () => {
    render(<CareerCards positions={basePositions} />);
    const badges = screen.getAllByTestId('department-badge');
    expect(badges.length).toBe(3);
    expect(badges[0]).toHaveTextContent('Engineering');
    expect(badges[1]).toHaveTextContent('Design');
    expect(badges[2]).toHaveTextContent('Infrastructure');
  });

  it('does not render department badge when not provided', () => {
    const positions: JobPosition[] = [
      { id: 'no-dept', title: 'No Department Role' },
    ];
    render(<CareerCards positions={positions} />);
    expect(screen.queryByTestId('department-badge')).not.toBeInTheDocument();
  });
});

// ─── Location badges ───────────────────────────────────────────────────────

describe('CareerCards -- location badges', () => {
  it('renders location badges', () => {
    render(<CareerCards positions={basePositions} />);
    const badges = screen.getAllByTestId('location-badge');
    expect(badges.length).toBe(3);
    expect(badges[0]).toHaveTextContent('Remote');
    expect(badges[1]).toHaveTextContent('San Francisco, CA');
    expect(badges[2]).toHaveTextContent('New York, NY');
  });

  it('does not render location badge when not provided', () => {
    const positions: JobPosition[] = [
      { id: 'no-loc', title: 'No Location Role' },
    ];
    render(<CareerCards positions={positions} />);
    expect(screen.queryByTestId('location-badge')).not.toBeInTheDocument();
  });
});

// ─── Type badges ────────────────────────────────────────────────────────────

describe('CareerCards -- type badges', () => {
  it('renders type badges with correct labels', () => {
    render(<CareerCards positions={basePositions} />);
    const badges = screen.getAllByTestId('type-badge');
    expect(badges.length).toBe(3);
    expect(badges[0]).toHaveTextContent('Full-time');
    expect(badges[1]).toHaveTextContent('Part-time');
    expect(badges[2]).toHaveTextContent('Contract');
  });

  it('renders internship type badge', () => {
    const positions: JobPosition[] = [
      { id: 'intern-1', title: 'Summer Intern', type: 'internship' },
    ];
    render(<CareerCards positions={positions} />);
    const badge = screen.getByTestId('type-badge');
    expect(badge).toHaveTextContent('Internship');
  });

  it('applies different colors per type', () => {
    const positions: JobPosition[] = [
      { id: 'ft', title: 'FT Role', type: 'full-time' },
      { id: 'pt', title: 'PT Role', type: 'part-time' },
      { id: 'ct', title: 'CT Role', type: 'contract' },
    ];
    render(<CareerCards positions={positions} />);
    const badges = screen.getAllByTestId('type-badge');
    expect(badges[0].className).toContain('bg-success-subtle');
    expect(badges[1].className).toContain('bg-warning-subtle');
    expect(badges[2].className).toContain('bg-info-subtle');
  });

  it('does not render type badge when not provided', () => {
    const positions: JobPosition[] = [
      { id: 'no-type', title: 'No Type Role' },
    ];
    render(<CareerCards positions={positions} />);
    expect(screen.queryByTestId('type-badge')).not.toBeInTheDocument();
  });
});

// ─── Description ────────────────────────────────────────────────────────────

describe('CareerCards -- description', () => {
  it('renders position descriptions', () => {
    render(<CareerCards positions={basePositions} />);
    expect(
      screen.getByText('Build beautiful, performant UIs with React and TypeScript.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Shape the future of our product experience.'),
    ).toBeInTheDocument();
  });

  it('renders cards without description when not provided', () => {
    const positions: JobPosition[] = [
      { id: 'no-desc', title: 'No Description Role' },
    ];
    render(<CareerCards positions={positions} />);
    expect(screen.getByText('No Description Role')).toBeInTheDocument();
  });
});

// ─── Heading ────────────────────────────────────────────────────────────────

describe('CareerCards -- heading', () => {
  it('renders string heading as h2', () => {
    render(<CareerCards positions={basePositions} heading="Open Positions" />);
    const heading = screen.getByText('Open Positions');
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe('H2');
  });

  it('renders custom heading node', () => {
    render(
      <CareerCards
        positions={basePositions}
        heading={<h3 data-testid="custom-heading">Custom Heading</h3>}
      />,
    );
    expect(screen.getByTestId('custom-heading')).toBeInTheDocument();
  });

  it('does not render heading section when not provided', () => {
    const { container } = render(<CareerCards positions={basePositions} />);
    expect(container.querySelector('h2')).not.toBeInTheDocument();
  });

  it('renders section description text', () => {
    render(
      <CareerCards
        positions={basePositions}
        heading="Join Us"
        description="We are always looking for talented people."
      />,
    );
    expect(
      screen.getByText('We are always looking for talented people.'),
    ).toBeInTheDocument();
  });
});

// ─── Grid columns ───────────────────────────────────────────────────────────

describe('CareerCards -- grid columns', () => {
  it('applies 3-column grid by default', () => {
    const { container } = render(<CareerCards positions={basePositions} />);
    const grid = container.querySelector('.grid');
    expect(grid?.className).toContain('lg:grid-cols-3');
  });

  it('applies 1-column grid when columns=1', () => {
    const { container } = render(<CareerCards positions={basePositions} columns={1} />);
    const grid = container.querySelector('.grid');
    expect(grid?.className).toContain('grid-cols-1');
    expect(grid?.className).not.toContain('sm:grid-cols-2');
  });

  it('applies 2-column grid when columns=2', () => {
    const { container } = render(<CareerCards positions={basePositions} columns={2} />);
    const grid = container.querySelector('.grid');
    expect(grid?.className).toContain('sm:grid-cols-2');
    expect(grid?.className).not.toContain('lg:grid-cols-3');
  });
});

// ─── Href makes card clickable ──────────────────────────────────────────────

describe('CareerCards -- href', () => {
  it('renders card as anchor when href is provided', () => {
    render(<CareerCards positions={basePositions} />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBe(3);
    expect(links[0]).toHaveAttribute('href', '/careers/senior-frontend-engineer');
  });

  it('renders card as div when href is not provided', () => {
    const positions: JobPosition[] = [
      { id: 'no-link', title: 'No Link Position' },
    ];
    render(<CareerCards positions={positions} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

// ─── Custom className ───────────────────────────────────────────────────────

describe('CareerCards -- custom className', () => {
  it('applies custom className to root element', () => {
    const { container } = render(
      <CareerCards positions={basePositions} className="my-custom-class" />,
    );
    expect(container.firstElementChild?.className).toContain('my-custom-class');
  });
});

// ─── renderLink ─────────────────────────────────────────────────────────────

describe('CareerCards -- renderLink', () => {
  it('uses renderLink for positions with href', () => {
    const renderLink = vi.fn(({ href, children, className }) => (
      <a href={href} className={className} data-testid="custom-link">
        {children}
      </a>
    ));

    render(<CareerCards positions={basePositions} renderLink={renderLink} />);

    const customLinks = screen.getAllByTestId('custom-link');
    expect(customLinks.length).toBe(3);
    expect(renderLink).toHaveBeenCalledTimes(3);
    expect(customLinks[0]).toHaveAttribute('href', '/careers/senior-frontend-engineer');
  });

  it('does not call renderLink for positions without href', () => {
    const renderLink = vi.fn(({ href, children, className }) => (
      <a href={href} className={className} data-testid="custom-link">
        {children}
      </a>
    ));

    const positions: JobPosition[] = [
      { id: 'no-href', title: 'No Href' },
      { id: 'has-href', title: 'Has Href', href: '/careers/test' },
    ];

    render(<CareerCards positions={positions} renderLink={renderLink} />);

    expect(renderLink).toHaveBeenCalledTimes(1);
    expect(screen.getAllByTestId('custom-link').length).toBe(1);
  });
});

// ─── Ref forwarding ─────────────────────────────────────────────────────────

describe('CareerCards -- ref forwarding', () => {
  it('forwards ref to the root section element', () => {
    const ref = { current: null as HTMLElement | null };
    render(<CareerCards ref={ref} positions={basePositions} />);
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current?.tagName).toBe('SECTION');
  });
});
