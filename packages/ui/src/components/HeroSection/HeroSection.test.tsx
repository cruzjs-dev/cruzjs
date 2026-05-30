import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HeroSection } from './HeroSection';

// Stub useIsMobile so tests run in jsdom without window.matchMedia
vi.mock('../../hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));

// ─── Heading ───────────────────────────────────────────────────────────────

describe('HeroSection -- heading', () => {
  it('renders heading text', () => {
    render(<HeroSection heading="Build faster" />);
    expect(screen.getByText('Build faster')).toBeInTheDocument();
  });

  it('renders heading as ReactNode', () => {
    render(
      <HeroSection heading={<span data-testid="custom-heading">Custom</span>} />,
    );
    expect(screen.getByTestId('custom-heading')).toBeInTheDocument();
  });
});

// ─── Subheading ────────────────────────────────────────────────────────────

describe('HeroSection -- subheading', () => {
  it('renders subheading when provided', () => {
    render(<HeroSection heading="Title" subheading="A powerful framework" />);
    expect(screen.getByText('A powerful framework')).toBeInTheDocument();
  });

  it('does not render subheading when omitted', () => {
    const { container } = render(<HeroSection heading="Title" />);
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBe(0);
  });
});

// ─── Actions slot ──────────────────────────────────────────────────────────

describe('HeroSection -- actions', () => {
  it('renders actions slot', () => {
    render(
      <HeroSection
        heading="Title"
        actions={<button type="button">Get Started</button>}
      />,
    );
    expect(screen.getByText('Get Started')).toBeInTheDocument();
    expect(screen.getByTestId('hero-actions')).toBeInTheDocument();
  });

  it('does not render actions container when omitted', () => {
    render(<HeroSection heading="Title" />);
    expect(screen.queryByTestId('hero-actions')).not.toBeInTheDocument();
  });
});

// ─── Media ─────────────────────────────────────────────────────────────────

describe('HeroSection -- media', () => {
  it('renders media slot', () => {
    render(
      <HeroSection
        heading="Title"
        media={<img src="/screenshot.png" alt="App screenshot" />}
      />,
    );
    expect(screen.getByTestId('hero-media')).toBeInTheDocument();
    expect(screen.getByAltText('App screenshot')).toBeInTheDocument();
  });

  it('does not render media container when omitted', () => {
    render(<HeroSection heading="Title" />);
    expect(screen.queryByTestId('hero-media')).not.toBeInTheDocument();
  });
});

// ─── Badge ─────────────────────────────────────────────────────────────────

describe('HeroSection -- badge', () => {
  it('renders badge when provided', () => {
    render(
      <HeroSection
        heading="Title"
        badge={<span>New Release</span>}
      />,
    );
    expect(screen.getByTestId('hero-badge')).toBeInTheDocument();
    expect(screen.getByText('New Release')).toBeInTheDocument();
  });

  it('does not render badge container when omitted', () => {
    render(<HeroSection heading="Title" />);
    expect(screen.queryByTestId('hero-badge')).not.toBeInTheDocument();
  });
});

// ─── Alignment ─────────────────────────────────────────────────────────────

describe('HeroSection -- alignment', () => {
  it('defaults to center alignment', () => {
    render(<HeroSection heading="Title" />);
    const section = screen.getByTestId('hero-section');
    // Center alignment: the content column should have text-center
    const contentCol = section.querySelector('.text-center');
    expect(contentCol).toBeInTheDocument();
  });

  it('applies left alignment', () => {
    render(<HeroSection heading="Title" alignment="left" />);
    const section = screen.getByTestId('hero-section');
    const contentCol = section.querySelector('.text-left');
    expect(contentCol).toBeInTheDocument();
  });
});

// ─── Background image ──────────────────────────────────────────────────────

describe('HeroSection -- backgroundImage', () => {
  it('applies background image as inline style', () => {
    render(<HeroSection heading="Title" backgroundImage="/hero-bg.jpg" />);
    const section = screen.getByTestId('hero-section');
    // jsdom may quote the URL, so use toContain for resilience
    expect(section.style.backgroundImage).toContain('/hero-bg.jpg');
    expect(section.style.backgroundSize).toBe('cover');
    expect(section.style.backgroundPosition).toContain('center');
  });
});

// ─── Background gradient ───────────────────────────────────────────────────

describe('HeroSection -- backgroundGradient', () => {
  it('applies background gradient as inline style', () => {
    const gradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    render(<HeroSection heading="Title" backgroundGradient={gradient} />);
    const section = screen.getByTestId('hero-section');
    // jsdom converts hex to rgb, so check that background contains the gradient direction
    expect(section.style.background).toContain('linear-gradient');
    expect(section.style.background).toContain('135deg');
  });
});

// ─── Full height ───────────────────────────────────────────────────────────

describe('HeroSection -- fullHeight', () => {
  it('adds min-h-screen when fullHeight is true', () => {
    render(<HeroSection heading="Title" fullHeight />);
    const section = screen.getByTestId('hero-section');
    expect(section.className).toContain('min-h-screen');
  });

  it('does not add min-h-screen by default', () => {
    render(<HeroSection heading="Title" />);
    const section = screen.getByTestId('hero-section');
    expect(section.className).not.toContain('min-h-screen');
  });
});

// ─── Custom className ──────────────────────────────────────────────────────

describe('HeroSection -- custom className', () => {
  it('merges custom className', () => {
    render(<HeroSection heading="Title" className="my-custom-class" />);
    const section = screen.getByTestId('hero-section');
    expect(section.className).toContain('my-custom-class');
  });
});

// ─── Padding variants ──────────────────────────────────────────────────────

describe('HeroSection -- padding', () => {
  it('applies md padding', () => {
    render(<HeroSection heading="Title" padding="md" />);
    const section = screen.getByTestId('hero-section');
    expect(section.className).toContain('py-12');
  });

  it('applies lg padding by default', () => {
    render(<HeroSection heading="Title" />);
    const section = screen.getByTestId('hero-section');
    expect(section.className).toContain('py-16');
  });

  it('applies xl padding', () => {
    render(<HeroSection heading="Title" padding="xl" />);
    const section = screen.getByTestId('hero-section');
    expect(section.className).toContain('py-24');
  });
});

// ─── Ref forwarding ────────────────────────────────────────────────────────

describe('HeroSection -- ref forwarding', () => {
  it('forwards ref to the root section element', () => {
    const ref = { current: null as HTMLElement | null };
    render(<HeroSection ref={ref} heading="Title" />);
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current?.tagName).toBe('SECTION');
  });
});
