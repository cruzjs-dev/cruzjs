import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CTASection } from './CTASection';

// ─── Heading ────────────────────────────────────────────────────────────────

describe('CTASection -- heading', () => {
  it('renders heading text', () => {
    render(<CTASection heading="Ready to get started?" />);
    expect(screen.getByText('Ready to get started?')).toBeInTheDocument();
  });

  it('renders heading as ReactNode', () => {
    render(
      <CTASection heading={<span data-testid="custom-heading">Custom</span>} />,
    );
    expect(screen.getByTestId('custom-heading')).toBeInTheDocument();
  });
});

// ─── Description ────────────────────────────────────────────────────────────

describe('CTASection -- description', () => {
  it('renders description when provided', () => {
    render(<CTASection heading="Title" description="Join thousands of developers" />);
    expect(screen.getByText('Join thousands of developers')).toBeInTheDocument();
  });

  it('does not render description paragraph when omitted', () => {
    const { container } = render(<CTASection heading="Title" />);
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBe(0);
  });
});

// ─── Actions slot ───────────────────────────────────────────────────────────

describe('CTASection -- actions', () => {
  it('renders actions slot', () => {
    render(
      <CTASection
        heading="Title"
        actions={<button type="button">Sign Up</button>}
      />,
    );
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
    expect(screen.getByTestId('cta-actions')).toBeInTheDocument();
  });

  it('does not render actions container when omitted', () => {
    render(<CTASection heading="Title" />);
    expect(screen.queryByTestId('cta-actions')).not.toBeInTheDocument();
  });
});

// ─── Variant styles ─────────────────────────────────────────────────────────

describe('CTASection -- variant styles', () => {
  it('applies subtle variant by default with color-mix background', () => {
    render(<CTASection heading="Title" />);
    const section = screen.getByTestId('cta-section');
    expect(section.style.backgroundColor).toContain('color-mix');
  });

  it('applies bold variant classes', () => {
    render(<CTASection heading="Title" variant="bold" />);
    const section = screen.getByTestId('cta-section');
    expect(section.className).toContain('bg-primary');
    expect(section.className).toContain('text-surface');
  });

  it('applies gradient variant with linear-gradient style', () => {
    render(<CTASection heading="Title" variant="gradient" />);
    const section = screen.getByTestId('cta-section');
    expect(section.style.background).toContain('linear-gradient');
  });
});

// ─── Alignment ──────────────────────────────────────────────────────────────

describe('CTASection -- alignment', () => {
  it('defaults to center alignment', () => {
    render(<CTASection heading="Title" />);
    const section = screen.getByTestId('cta-section');
    const contentCol = section.querySelector('.text-center');
    expect(contentCol).toBeInTheDocument();
  });

  it('applies left alignment', () => {
    render(<CTASection heading="Title" alignment="left" />);
    const section = screen.getByTestId('cta-section');
    const contentCol = section.querySelector('.text-left');
    expect(contentCol).toBeInTheDocument();
  });
});

// ─── Background image ───────────────────────────────────────────────────────

describe('CTASection -- backgroundImage', () => {
  it('applies background image as inline style', () => {
    render(<CTASection heading="Title" backgroundImage="/cta-bg.jpg" />);
    const section = screen.getByTestId('cta-section');
    expect(section.style.backgroundImage).toContain('/cta-bg.jpg');
    expect(section.style.backgroundSize).toBe('cover');
    expect(section.style.backgroundPosition).toContain('center');
  });
});

// ─── Custom className ───────────────────────────────────────────────────────

describe('CTASection -- custom className', () => {
  it('merges custom className', () => {
    render(<CTASection heading="Title" className="my-custom-class" />);
    const section = screen.getByTestId('cta-section');
    expect(section.className).toContain('my-custom-class');
  });
});

// ─── Ref forwarding ─────────────────────────────────────────────────────────

describe('CTASection -- ref forwarding', () => {
  it('forwards ref to the root section element', () => {
    const ref = { current: null as HTMLElement | null };
    render(<CTASection ref={ref} heading="Title" />);
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current?.tagName).toBe('SECTION');
  });
});
