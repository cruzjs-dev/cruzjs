import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContactSection } from './ContactSection';

// Stub useIsMobile so tests run in jsdom without window.matchMedia
vi.mock('../../hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));

// ─── Heading ──────────────────────────────────────────────────────────────

describe('ContactSection -- heading', () => {
  it('renders heading text', () => {
    render(<ContactSection heading="Get in Touch" form={<div>form</div>} />);
    expect(screen.getByText('Get in Touch')).toBeInTheDocument();
  });

  it('does not render heading when omitted', () => {
    render(<ContactSection form={<div>form</div>} />);
    const headings = screen.queryAllByRole('heading');
    expect(headings.length).toBe(0);
  });
});

// ─── Description ──────────────────────────────────────────────────────────

describe('ContactSection -- description', () => {
  it('renders description when provided', () => {
    render(
      <ContactSection
        heading="Contact"
        description="We'd love to hear from you"
        form={<div>form</div>}
      />,
    );
    expect(screen.getByText("We'd love to hear from you")).toBeInTheDocument();
  });

  it('does not render description paragraph when omitted', () => {
    render(<ContactSection heading="Contact" form={<div>form</div>} />);
    const section = screen.getByTestId('contact-section');
    const paragraphs = section.querySelectorAll('p');
    expect(paragraphs.length).toBe(0);
  });
});

// ─── Form slot ────────────────────────────────────────────────────────────

describe('ContactSection -- form', () => {
  it('renders form slot content', () => {
    render(
      <ContactSection
        form={<div data-testid="my-form">Contact Form</div>}
      />,
    );
    expect(screen.getByTestId('my-form')).toBeInTheDocument();
    expect(screen.getByText('Contact Form')).toBeInTheDocument();
    expect(screen.getByTestId('contact-form')).toBeInTheDocument();
  });
});

// ─── Contact info items ───────────────────────────────────────────────────

describe('ContactSection -- contactInfo', () => {
  it('renders contact info items with icon, label, and value', () => {
    const info = [
      {
        icon: <span data-testid="email-icon">@</span>,
        label: 'Email',
        value: 'hello@example.com',
      },
      {
        icon: <span data-testid="phone-icon">T</span>,
        label: 'Phone',
        value: '+1 (555) 123-4567',
      },
    ];
    render(<ContactSection form={<div>form</div>} contactInfo={info} />);

    expect(screen.getByTestId('contact-info-list')).toBeInTheDocument();
    expect(screen.getByTestId('email-icon')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('hello@example.com')).toBeInTheDocument();
    expect(screen.getByTestId('phone-icon')).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();
    expect(screen.getByText('+1 (555) 123-4567')).toBeInTheDocument();
  });

  it('does not render contact info list when omitted', () => {
    render(<ContactSection form={<div>form</div>} />);
    expect(screen.queryByTestId('contact-info-list')).not.toBeInTheDocument();
  });
});

// ─── Social links ─────────────────────────────────────────────────────────

describe('ContactSection -- socialLinks', () => {
  it('renders social links slot', () => {
    render(
      <ContactSection
        form={<div>form</div>}
        socialLinks={<div data-testid="socials">Twitter | GitHub</div>}
      />,
    );
    expect(screen.getByTestId('contact-social-links')).toBeInTheDocument();
    expect(screen.getByTestId('socials')).toBeInTheDocument();
  });

  it('does not render social links container when omitted', () => {
    render(<ContactSection form={<div>form</div>} />);
    expect(screen.queryByTestId('contact-social-links')).not.toBeInTheDocument();
  });
});

// ─── Map slot ─────────────────────────────────────────────────────────────

describe('ContactSection -- map', () => {
  it('renders map slot', () => {
    render(
      <ContactSection
        form={<div>form</div>}
        map={<div data-testid="map-embed">Map here</div>}
      />,
    );
    expect(screen.getByTestId('contact-map')).toBeInTheDocument();
    expect(screen.getByTestId('map-embed')).toBeInTheDocument();
  });

  it('does not render map container when omitted', () => {
    render(<ContactSection form={<div>form</div>} />);
    expect(screen.queryByTestId('contact-map')).not.toBeInTheDocument();
  });
});

// ─── Reversed layout ─────────────────────────────────────────────────────

describe('ContactSection -- reversed', () => {
  it('applies order styles when reversed is true', () => {
    render(
      <ContactSection
        form={<div>form</div>}
        contactInfo={[{ icon: <span>@</span>, label: 'Email', value: 'a@b.com' }]}
        reversed
      />,
    );
    const formEl = screen.getByTestId('contact-form');
    const infoEl = screen.getByTestId('contact-info-column');
    expect(formEl.style.order).toBe('2');
    expect(infoEl.style.order).toBe('1');
  });

  it('does not apply order styles when reversed is false', () => {
    render(
      <ContactSection
        form={<div>form</div>}
        contactInfo={[{ icon: <span>@</span>, label: 'Email', value: 'a@b.com' }]}
      />,
    );
    const formEl = screen.getByTestId('contact-form');
    const infoEl = screen.getByTestId('contact-info-column');
    expect(formEl.style.order).toBe('');
    expect(infoEl.style.order).toBe('');
  });
});

// ─── Custom className ─────────────────────────────────────────────────────

describe('ContactSection -- custom className', () => {
  it('merges custom className', () => {
    render(
      <ContactSection
        form={<div>form</div>}
        className="my-custom-class"
      />,
    );
    const section = screen.getByTestId('contact-section');
    expect(section.className).toContain('my-custom-class');
  });
});

// ─── Ref forwarding ───────────────────────────────────────────────────────

describe('ContactSection -- ref forwarding', () => {
  it('forwards ref to the root section element', () => {
    const ref = { current: null as HTMLElement | null };
    render(<ContactSection ref={ref} form={<div>form</div>} />);
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current?.tagName).toBe('SECTION');
  });
});
