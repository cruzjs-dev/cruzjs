import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthLayout } from './AuthLayout';

// --- Title Rendering -----------------------------------------------------------

describe('AuthLayout -- title', () => {
  it('renders the title text', () => {
    render(<AuthLayout title="Sign in" />);
    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });

  it('renders the title as an h1 element', () => {
    render(<AuthLayout title="Sign in" />);
    const heading = screen.getByText('Sign in');
    expect(heading.tagName).toBe('H1');
  });

  it('does not render heading when title is not provided', () => {
    const { container } = render(<AuthLayout>Content</AuthLayout>);
    expect(container.querySelector('h1')).toBeNull();
  });
});

// --- Subtitle ------------------------------------------------------------------

describe('AuthLayout -- subtitle', () => {
  it('renders subtitle text when provided', () => {
    render(<AuthLayout title="Sign in" subtitle="Welcome back" />);
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
  });

  it('does not render subtitle element when not provided', () => {
    const { container } = render(<AuthLayout title="Sign in" />);
    // The header section should exist (has title) but no <p>
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBe(0);
  });

  it('does not render header section when neither title nor subtitle is provided', () => {
    const { container } = render(<AuthLayout>Content only</AuthLayout>);
    expect(container.querySelector('h1')).toBeNull();
    expect(container.querySelectorAll('p').length).toBe(0);
  });
});

// --- Logo ----------------------------------------------------------------------

describe('AuthLayout -- logo', () => {
  it('renders custom logo when provided', () => {
    render(
      <AuthLayout
        title="Login"
        logo={<span data-testid="logo">MyApp</span>}
      />,
    );
    expect(screen.getByTestId('logo')).toBeInTheDocument();
  });

  it('does not render logo wrapper when logo is not provided', () => {
    const { container } = render(<AuthLayout title="Login" />);
    // Logo wrapper has mb-6 class; without logo, no such wrapper
    const wrappers = container.querySelectorAll('.mb-6');
    expect(wrappers.length).toBe(0);
  });
});

// --- Footer --------------------------------------------------------------------

describe('AuthLayout -- footer', () => {
  it('renders footer content when provided', () => {
    render(
      <AuthLayout title="Sign in" footer={<span>Copyright 2026</span>} />,
    );
    expect(screen.getByText('Copyright 2026')).toBeInTheDocument();
  });

  it('does not render footer wrapper when footer is not provided', () => {
    const { container } = render(<AuthLayout title="Login" />);
    const footerWrappers = container.querySelectorAll('.mt-6');
    expect(footerWrappers.length).toBe(0);
  });
});

// --- Children ------------------------------------------------------------------

describe('AuthLayout -- children', () => {
  it('renders children inside the card', () => {
    render(
      <AuthLayout title="Login">
        <form data-testid="login-form">
          <input type="email" />
        </form>
      </AuthLayout>,
    );
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
  });
});

// --- maxWidth ------------------------------------------------------------------

describe('AuthLayout -- maxWidth', () => {
  it('applies max-w-sm for sm size', () => {
    const { container } = render(
      <AuthLayout title="Small" maxWidth="sm">
        Content
      </AuthLayout>,
    );
    const card = container.querySelector('.rounded-2xl');
    expect(card?.className).toContain('max-w-sm');
  });

  it('applies max-w-md by default', () => {
    const { container } = render(<AuthLayout title="Default">Content</AuthLayout>);
    const card = container.querySelector('.rounded-2xl');
    expect(card?.className).toContain('max-w-md');
  });

  it('applies max-w-lg for lg size', () => {
    const { container } = render(
      <AuthLayout title="Large" maxWidth="lg">
        Content
      </AuthLayout>,
    );
    const card = container.querySelector('.rounded-2xl');
    expect(card?.className).toContain('max-w-lg');
  });
});

// --- className -----------------------------------------------------------------

describe('AuthLayout -- className', () => {
  it('merges custom className onto the root element', () => {
    const { container } = render(
      <AuthLayout title="Test" className="custom-bg">
        Content
      </AuthLayout>,
    );
    expect(container.firstElementChild).toHaveClass('custom-bg');
  });

  it('preserves default layout classes when custom className is added', () => {
    const { container } = render(
      <AuthLayout title="Test" className="extra">
        Content
      </AuthLayout>,
    );
    expect(container.firstElementChild).toHaveClass('min-h-screen');
  });
});

// --- Ref Forwarding ------------------------------------------------------------

describe('AuthLayout -- ref forwarding', () => {
  it('forwards ref to the root element', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(
      <AuthLayout ref={ref} title="With ref">
        Content
      </AuthLayout>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

// --- HTML Attributes -----------------------------------------------------------

describe('AuthLayout -- HTML attributes', () => {
  it('passes through additional HTML attributes', () => {
    render(
      <AuthLayout title="Test" data-testid="auth-layout" id="al-1">
        Content
      </AuthLayout>,
    );
    const el = screen.getByTestId('auth-layout');
    expect(el).toHaveAttribute('id', 'al-1');
  });
});

// --- Full composition ----------------------------------------------------------

describe('AuthLayout -- full composition', () => {
  it('renders all slots together', () => {
    render(
      <AuthLayout
        title="Create Account"
        subtitle="Join us today"
        logo={<img data-testid="brand-logo" alt="Brand" src="/logo.svg" />}
        footer={<a href="/terms">Terms of Service</a>}
        maxWidth="lg"
      >
        <div data-testid="form-body">Form fields here</div>
      </AuthLayout>,
    );

    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(screen.getByText('Join us today')).toBeInTheDocument();
    expect(screen.getByTestId('brand-logo')).toBeInTheDocument();
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    expect(screen.getByTestId('form-body')).toBeInTheDocument();
  });
});
