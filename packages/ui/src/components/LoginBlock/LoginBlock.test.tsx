import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LoginBlock } from './LoginBlock';

// --- Title and subtitle --------------------------------------------------------

describe('LoginBlock -- title and subtitle', () => {
  it('renders title and subtitle', () => {
    render(<LoginBlock title="Welcome" subtitle="Please log in" />);
    expect(screen.getByRole('heading', { name: 'Welcome' })).toBeInTheDocument();
    expect(screen.getByText('Please log in')).toBeInTheDocument();
  });

  it('renders default title and subtitle when not provided', () => {
    render(<LoginBlock />);
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
  });
});

// --- Inputs --------------------------------------------------------------------

describe('LoginBlock -- inputs', () => {
  it('renders email and password inputs', () => {
    render(<LoginBlock />);
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('email input has type email', () => {
    render(<LoginBlock />);
    const emailInput = screen.getByLabelText('Email address');
    expect(emailInput).toHaveAttribute('type', 'email');
  });

  it('password input has type password by default', () => {
    render(<LoginBlock />);
    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('toggles password visibility', () => {
    render(<LoginBlock />);
    const passwordInput = screen.getByLabelText('Password');
    const toggleButton = screen.getByLabelText('Show password');

    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');

    const hideButton = screen.getByLabelText('Hide password');
    fireEvent.click(hideButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});

// --- onSubmit ------------------------------------------------------------------

describe('LoginBlock -- onSubmit', () => {
  it('calls onSubmit with email, password, remember', () => {
    const handleSubmit = vi.fn();
    render(
      <LoginBlock onSubmit={handleSubmit} showRememberMe forgotPasswordHref="#" />,
    );

    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');
    const rememberCheckbox = screen.getByRole('checkbox');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'secret123' } });
    fireEvent.click(rememberCheckbox);

    const form = emailInput.closest('form')!;
    fireEvent.submit(form);

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith('test@example.com', 'secret123', true);
  });
});

// --- Remember me ---------------------------------------------------------------

describe('LoginBlock -- remember me', () => {
  it('renders remember me checkbox', () => {
    render(<LoginBlock showRememberMe />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.getByText('Remember me')).toBeInTheDocument();
  });

  it('hides remember me when showRememberMe is false', () => {
    render(<LoginBlock showRememberMe={false} />);
    expect(screen.queryByText('Remember me')).not.toBeInTheDocument();
  });
});

// --- Forgot password -----------------------------------------------------------

describe('LoginBlock -- forgot password', () => {
  it('renders forgot password link', () => {
    render(<LoginBlock forgotPasswordHref="/forgot" />);
    const link = screen.getByText('Forgot password?');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/forgot');
  });

  it('renders custom forgot password label', () => {
    render(
      <LoginBlock
        forgotPasswordHref="/forgot"
        forgotPasswordLabel="Reset it"
      />,
    );
    expect(screen.getByText('Reset it')).toBeInTheDocument();
  });

  it('does not render forgot password link when href not provided', () => {
    render(<LoginBlock />);
    expect(screen.queryByText('Forgot password?')).not.toBeInTheDocument();
  });
});

// --- Social providers ----------------------------------------------------------

describe('LoginBlock -- social providers', () => {
  const providers = [
    { id: 'google', label: 'Google', icon: <span data-testid="google-icon">G</span> },
    { id: 'github', label: 'GitHub', icon: <span data-testid="github-icon">GH</span> },
  ];

  it('renders social provider buttons', () => {
    render(<LoginBlock socialProviders={providers} />);
    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByTestId('google-icon')).toBeInTheDocument();
    expect(screen.getByTestId('github-icon')).toBeInTheDocument();
  });

  it('renders or continue with divider', () => {
    render(<LoginBlock socialProviders={providers} />);
    expect(screen.getByText('or continue with')).toBeInTheDocument();
  });

  it('calls onSocialLogin when social button clicked', () => {
    const handleSocial = vi.fn();
    render(
      <LoginBlock
        socialProviders={providers}
        onSocialLogin={handleSocial}
      />,
    );

    fireEvent.click(screen.getByText('Google'));
    expect(handleSocial).toHaveBeenCalledWith('google');

    fireEvent.click(screen.getByText('GitHub'));
    expect(handleSocial).toHaveBeenCalledWith('github');
  });

  it('does not render social section when no providers', () => {
    render(<LoginBlock />);
    expect(screen.queryByText('or continue with')).not.toBeInTheDocument();
  });
});

// --- Error message -------------------------------------------------------------

describe('LoginBlock -- error', () => {
  it('renders error message', () => {
    render(<LoginBlock error="Invalid credentials" />);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Invalid credentials');
  });

  it('does not render error when not provided', () => {
    render(<LoginBlock />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

// --- Loading state -------------------------------------------------------------

describe('LoginBlock -- loading', () => {
  it('shows loading state', () => {
    render(<LoginBlock loading />);
    const button = screen.getByRole('button', { name: /signing in/i });
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Signing in...');
  });

  it('shows sign in text when not loading', () => {
    render(<LoginBlock />);
    expect(
      screen.getByRole('button', { name: /sign in/i }),
    ).toHaveTextContent('Sign in');
  });
});

// --- Register link -------------------------------------------------------------

describe('LoginBlock -- register link', () => {
  it('renders register link', () => {
    render(<LoginBlock registerHref="/register" />);
    const link = screen.getByText('Create an account');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/register');
  });

  it('renders custom register label', () => {
    render(
      <LoginBlock registerHref="/register" registerLabel="Sign up now" />,
    );
    expect(screen.getByText('Sign up now')).toBeInTheDocument();
  });

  it('does not render register section when href not provided', () => {
    render(<LoginBlock />);
    expect(screen.queryByText('Create an account')).not.toBeInTheDocument();
  });
});

// --- Logo ----------------------------------------------------------------------

describe('LoginBlock -- logo', () => {
  it('renders logo when provided', () => {
    render(<LoginBlock logo={<img data-testid="logo" alt="Logo" src="/logo.svg" />} />);
    expect(screen.getByTestId('logo')).toBeInTheDocument();
  });

  it('does not render logo wrapper when not provided', () => {
    const { container } = render(<LoginBlock />);
    const logoWrapper = container.querySelector('.mb-6');
    expect(logoWrapper).toBeNull();
  });
});

// --- renderLink ----------------------------------------------------------------

describe('LoginBlock -- renderLink', () => {
  it('uses custom renderLink for forgot password', () => {
    const customLink = vi.fn(
      ({ href, children, className }: { href: string; children: React.ReactNode; className: string }) => (
        <span data-testid="custom-link" data-href={href} className={className}>
          {children}
        </span>
      ),
    );

    render(
      <LoginBlock forgotPasswordHref="/forgot" renderLink={customLink} />,
    );

    expect(screen.getByTestId('custom-link')).toBeInTheDocument();
    expect(customLink).toHaveBeenCalled();
  });
});

// --- Ref forwarding ------------------------------------------------------------

describe('LoginBlock -- ref forwarding', () => {
  it('forwards ref to root element', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<LoginBlock ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

// --- HTML attributes -----------------------------------------------------------

describe('LoginBlock -- HTML attributes', () => {
  it('passes through additional HTML attributes', () => {
    render(<LoginBlock data-testid="login-block" id="lb-1" />);
    const el = screen.getByTestId('login-block');
    expect(el).toHaveAttribute('id', 'lb-1');
  });

  it('merges custom className', () => {
    const { container } = render(<LoginBlock className="custom-class" />);
    expect(container.firstElementChild).toHaveClass('custom-class');
    expect(container.firstElementChild).toHaveClass('max-w-sm');
  });
});
