import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LogoCloud } from './LogoCloud';
import type { LogoItem } from './LogoCloud';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const sampleLogos: LogoItem[] = [
  { id: 'acme', src: '/logos/acme.svg', alt: 'Acme Corp' },
  { id: 'globex', src: '/logos/globex.svg', alt: 'Globex Inc' },
  { id: 'initech', src: '/logos/initech.svg', alt: 'Initech' },
  { id: 'umbrella', src: '/logos/umbrella.svg', alt: 'Umbrella Corp' },
  { id: 'wayne', src: '/logos/wayne.svg', alt: 'Wayne Enterprises' },
];

const logosWithLinks: LogoItem[] = [
  { id: 'acme', src: '/logos/acme.svg', alt: 'Acme Corp', href: 'https://acme.example.com' },
  { id: 'globex', src: '/logos/globex.svg', alt: 'Globex Inc', href: 'https://globex.example.com' },
];

// ─── Renders logo images with alt text ────────────────────────────────────

describe('LogoCloud -- rendering', () => {
  it('renders logo images with alt text', () => {
    render(<LogoCloud logos={sampleLogos} />);
    for (const logo of sampleLogos) {
      const img = screen.getByAltText(logo.alt);
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', logo.src);
    }
  });
});

// ─── Heading ──────────────────────────────────────────────────────────────

describe('LogoCloud -- heading', () => {
  it('renders heading when provided', () => {
    render(<LogoCloud logos={sampleLogos} heading="Trusted by" />);
    expect(screen.getByText('Trusted by')).toBeInTheDocument();
    expect(screen.getByTestId('logo-cloud-heading')).toBeInTheDocument();
  });

  it('does not render heading section when heading is absent', () => {
    render(<LogoCloud logos={sampleLogos} />);
    expect(screen.queryByTestId('logo-cloud-heading')).not.toBeInTheDocument();
  });

  it('renders custom heading node', () => {
    render(
      <LogoCloud
        logos={sampleLogos}
        heading={<h2 data-testid="custom-heading">Our Partners</h2>}
      />,
    );
    expect(screen.getByTestId('custom-heading')).toBeInTheDocument();
    expect(screen.getByText('Our Partners')).toBeInTheDocument();
  });
});

// ─── Column grid class ──────────────────────────────────────────────────

describe('LogoCloud -- grid columns', () => {
  it('applies default 5-column grid class', () => {
    render(<LogoCloud logos={sampleLogos} />);
    const grid = screen.getByTestId('logo-cloud-grid');
    expect(grid.className).toContain('lg:grid-cols-5');
  });

  it('applies 3-column grid class', () => {
    render(<LogoCloud logos={sampleLogos} columns={3} />);
    const grid = screen.getByTestId('logo-cloud-grid');
    expect(grid.className).toContain('sm:grid-cols-3');
    expect(grid.className).not.toContain('lg:grid-cols-5');
  });

  it('applies 4-column grid class', () => {
    render(<LogoCloud logos={sampleLogos} columns={4} />);
    const grid = screen.getByTestId('logo-cloud-grid');
    expect(grid.className).toContain('sm:grid-cols-4');
  });

  it('applies 6-column grid class', () => {
    render(<LogoCloud logos={sampleLogos} columns={6} />);
    const grid = screen.getByTestId('logo-cloud-grid');
    expect(grid.className).toContain('lg:grid-cols-6');
  });
});

// ─── Grayscale ──────────────────────────────────────────────────────────

describe('LogoCloud -- grayscale', () => {
  it('applies grayscale class by default', () => {
    render(<LogoCloud logos={[sampleLogos[0]]} />);
    const img = screen.getByAltText('Acme Corp');
    expect(img.className).toContain('grayscale');
    expect(img.className).toContain('opacity-60');
  });

  it('removes grayscale class when grayscale=false', () => {
    render(<LogoCloud logos={[sampleLogos[0]]} grayscale={false} />);
    const img = screen.getByAltText('Acme Corp');
    expect(img.className).not.toContain('grayscale');
    expect(img.className).not.toContain('opacity-60');
  });
});

// ─── Links ────────────────────────────────────────────────────────────────

describe('LogoCloud -- links', () => {
  it('wraps logos with href in anchor elements', () => {
    render(<LogoCloud logos={logosWithLinks} />);
    const img = screen.getByAltText('Acme Corp');
    const anchor = img.closest('a');
    expect(anchor).toBeInTheDocument();
    expect(anchor).toHaveAttribute('href', 'https://acme.example.com');
  });

  it('does not wrap logos without href in anchor elements', () => {
    render(<LogoCloud logos={sampleLogos} />);
    const img = screen.getByAltText('Acme Corp');
    const anchor = img.closest('a');
    expect(anchor).not.toBeInTheDocument();
  });
});

// ─── maxLogoHeight ────────────────────────────────────────────────────────

describe('LogoCloud -- maxLogoHeight', () => {
  it('applies maxLogoHeight as inline style', () => {
    render(<LogoCloud logos={[sampleLogos[0]]} maxLogoHeight={40} />);
    const img = screen.getByAltText('Acme Corp');
    expect(img.style.maxHeight).toBe('40px');
  });

  it('does not set maxHeight when maxLogoHeight is not provided', () => {
    render(<LogoCloud logos={[sampleLogos[0]]} />);
    const img = screen.getByAltText('Acme Corp');
    expect(img.style.maxHeight).toBe('');
  });
});

// ─── Custom className ─────────────────────────────────────────────────────

describe('LogoCloud -- className', () => {
  it('supports custom className', () => {
    const { container } = render(
      <LogoCloud logos={sampleLogos} className="my-custom-class" />,
    );
    expect(container.firstElementChild).toHaveClass('my-custom-class');
    expect(container.firstElementChild).toHaveClass('logo-cloud');
  });
});

// ─── renderLink callback ──────────────────────────────────────────────────

describe('LogoCloud -- renderLink callback', () => {
  it('calls renderLink for logos with href', () => {
    const renderLink = vi.fn(({ href, children, className }) => (
      <a href={href} className={className} data-testid="custom-link">
        {children}
      </a>
    ));

    render(
      <LogoCloud logos={logosWithLinks} renderLink={renderLink} />,
    );

    expect(renderLink).toHaveBeenCalledTimes(2);
    expect(screen.getAllByTestId('custom-link')).toHaveLength(2);
  });

  it('does not call renderLink for logos without href', () => {
    const renderLink = vi.fn(({ href, children, className }) => (
      <a href={href} className={className} data-testid="custom-link">
        {children}
      </a>
    ));

    render(
      <LogoCloud logos={sampleLogos} renderLink={renderLink} />,
    );

    expect(renderLink).not.toHaveBeenCalled();
  });
});

// ─── Ref forwarding ───────────────────────────────────────────────────────

describe('LogoCloud -- ref forwarding', () => {
  it('forwards ref to the root section element', () => {
    const ref = { current: null as HTMLElement | null };
    render(<LogoCloud ref={ref} logos={sampleLogos} />);
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current?.tagName).toBe('SECTION');
  });
});

// ─── Marquee mode ─────────────────────────────────────────────────────────

describe('LogoCloud -- marquee mode', () => {
  it('renders marquee container when marquee=true', () => {
    render(<LogoCloud logos={sampleLogos} marquee />);
    expect(screen.getByTestId('logo-cloud-marquee')).toBeInTheDocument();
    expect(screen.queryByTestId('logo-cloud-grid')).not.toBeInTheDocument();
  });

  it('renders grid container when marquee=false (default)', () => {
    render(<LogoCloud logos={sampleLogos} />);
    expect(screen.getByTestId('logo-cloud-grid')).toBeInTheDocument();
    expect(screen.queryByTestId('logo-cloud-marquee')).not.toBeInTheDocument();
  });
});
