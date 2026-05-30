import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Footer } from './Footer';

// ─── Renders footer element ───────────────────────────────────────────────

describe('Footer -- root element', () => {
  it('renders a footer element', () => {
    render(<Footer />);
    const el = screen.getByTestId('footer');
    expect(el.tagName).toBe('FOOTER');
  });
});

// ─── Logo ─────────────────────────────────────────────────────────────────

describe('Footer -- logo', () => {
  it('renders logo when provided', () => {
    render(<Footer logo={<span>Acme</span>} />);
    expect(screen.getByTestId('footer-logo')).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
  });

  it('does not render logo container when omitted', () => {
    render(<Footer />);
    expect(screen.queryByTestId('footer-logo')).not.toBeInTheDocument();
  });
});

// ─── Tagline ──────────────────────────────────────────────────────────────

describe('Footer -- tagline', () => {
  it('renders tagline when provided', () => {
    render(<Footer tagline="Build faster, ship sooner." />);
    expect(screen.getByTestId('footer-tagline')).toBeInTheDocument();
    expect(screen.getByText('Build faster, ship sooner.')).toBeInTheDocument();
  });

  it('does not render tagline when omitted', () => {
    render(<Footer />);
    expect(screen.queryByTestId('footer-tagline')).not.toBeInTheDocument();
  });
});

// ─── Link group titles ────────────────────────────────────────────────────

describe('Footer -- link group titles', () => {
  it('renders link group titles', () => {
    render(
      <Footer
        linkGroups={[
          { title: 'Product', links: [{ label: 'Features', href: '/features' }] },
          { title: 'Company', links: [{ label: 'About', href: '/about' }] },
        ]}
      />,
    );
    const titles = screen.getAllByTestId('footer-group-title');
    expect(titles).toHaveLength(2);
    expect(titles[0]).toHaveTextContent('Product');
    expect(titles[1]).toHaveTextContent('Company');
  });
});

// ─── Links ────────────────────────────────────────────────────────────────

describe('Footer -- links', () => {
  it('renders links within groups', () => {
    render(
      <Footer
        linkGroups={[
          {
            title: 'Product',
            links: [
              { label: 'Features', href: '/features' },
              { label: 'Pricing', href: '/pricing' },
            ],
          },
        ]}
      />,
    );
    const features = screen.getByText('Features');
    expect(features).toBeInTheDocument();
    expect(features.closest('a')).toHaveAttribute('href', '/features');

    const pricing = screen.getByText('Pricing');
    expect(pricing).toBeInTheDocument();
    expect(pricing.closest('a')).toHaveAttribute('href', '/pricing');
  });
});

// ─── Social links ─────────────────────────────────────────────────────────

describe('Footer -- social links', () => {
  it('renders social links slot', () => {
    render(
      <Footer
        socialLinks={
          <>
            <a href="https://twitter.com" aria-label="Twitter">T</a>
            <a href="https://github.com" aria-label="GitHub">G</a>
          </>
        }
      />,
    );
    expect(screen.getByTestId('footer-social')).toBeInTheDocument();
    expect(screen.getByLabelText('Twitter')).toBeInTheDocument();
    expect(screen.getByLabelText('GitHub')).toBeInTheDocument();
  });

  it('does not render social links container when omitted', () => {
    render(<Footer />);
    expect(screen.queryByTestId('footer-social')).not.toBeInTheDocument();
  });
});

// ─── Copyright ────────────────────────────────────────────────────────────

describe('Footer -- copyright', () => {
  it('renders copyright text', () => {
    render(<Footer copyright="2026 Acme Inc." />);
    expect(screen.getByTestId('footer-copyright')).toBeInTheDocument();
    expect(screen.getByText('2026 Acme Inc.')).toBeInTheDocument();
  });

  it('does not render copyright container when omitted', () => {
    render(<Footer />);
    expect(screen.queryByTestId('footer-copyright')).not.toBeInTheDocument();
  });
});

// ─── Newsletter slot ──────────────────────────────────────────────────────

describe('Footer -- newsletter', () => {
  it('renders newsletter slot', () => {
    render(
      <Footer
        newsletter={
          <form data-testid="newsletter-form">
            <input type="email" placeholder="you@example.com" />
            <button type="submit">Subscribe</button>
          </form>
        }
      />,
    );
    expect(screen.getByTestId('footer-newsletter')).toBeInTheDocument();
    expect(screen.getByTestId('newsletter-form')).toBeInTheDocument();
  });

  it('does not render newsletter container when omitted', () => {
    render(<Footer />);
    expect(screen.queryByTestId('footer-newsletter')).not.toBeInTheDocument();
  });
});

// ─── Custom className ─────────────────────────────────────────────────────

describe('Footer -- custom className', () => {
  it('merges custom className', () => {
    render(<Footer className="my-custom-footer" />);
    const el = screen.getByTestId('footer');
    expect(el.className).toContain('my-custom-footer');
  });
});

// ─── renderLink ───────────────────────────────────────────────────────────

describe('Footer -- renderLink', () => {
  it('uses custom renderLink for link groups', () => {
    const customRenderLink = ({
      href,
      children,
      className,
    }: {
      href: string;
      children: React.ReactNode;
      className?: string;
    }) => (
      <span data-testid="custom-link" data-href={href} className={className}>
        {children}
      </span>
    );

    render(
      <Footer
        renderLink={customRenderLink}
        linkGroups={[
          {
            title: 'Product',
            links: [{ label: 'Features', href: '/features' }],
          },
        ]}
      />,
    );
    const customLinks = screen.getAllByTestId('custom-link');
    expect(customLinks).toHaveLength(1);
    expect(customLinks[0]).toHaveAttribute('data-href', '/features');
    expect(customLinks[0]).toHaveTextContent('Features');
  });
});

// ─── Ref forwarding ───────────────────────────────────────────────────────

describe('Footer -- ref forwarding', () => {
  it('forwards ref to the root footer element', () => {
    const ref = { current: null as HTMLElement | null };
    render(<Footer ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current?.tagName).toBe('FOOTER');
  });
});
