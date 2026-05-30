import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RegisterBlock } from './RegisterBlock';

describe('RegisterBlock', () => {
  it('renders title and subtitle', () => {
    render(<RegisterBlock title="Join Us" subtitle="Start building today" />);
    expect(screen.getByText('Join Us')).toBeInTheDocument();
    expect(screen.getByText('Start building today')).toBeInTheDocument();
  });

  it('renders name, email, password inputs', () => {
    render(<RegisterBlock />);
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('calls onSubmit with all field values', () => {
    const onSubmit = vi.fn();
    render(<RegisterBlock onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Jane Doe' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'jane@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'secret123' },
    });

    const termsCheckbox = screen.getByRole('checkbox');
    fireEvent.click(termsCheckbox);

    fireEvent.submit(screen.getByRole('button', { name: 'Create account' }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'secret123',
      acceptTerms: true,
    });
  });

  it('renders terms checkbox', () => {
    render(<RegisterBlock />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(
      screen.getByText('I agree to the Terms and Privacy Policy'),
    ).toBeInTheDocument();
  });

  it('renders social providers', () => {
    const providers = [
      { id: 'google', label: 'Google', icon: <span data-testid="google-icon" /> },
      { id: 'github', label: 'GitHub', icon: <span data-testid="github-icon" /> },
    ];
    render(<RegisterBlock socialProviders={providers} />);
    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.getByText('GitHub')).toBeInTheDocument();
  });

  it('calls onSocialLogin', () => {
    const onSocialLogin = vi.fn();
    const providers = [
      { id: 'google', label: 'Google', icon: <span /> },
    ];
    render(
      <RegisterBlock
        socialProviders={providers}
        onSocialLogin={onSocialLogin}
      />,
    );
    fireEvent.click(screen.getByText('Google'));
    expect(onSocialLogin).toHaveBeenCalledWith('google');
  });

  it('renders error message', () => {
    render(<RegisterBlock error="Email already taken" />);
    expect(screen.getByText('Email already taken')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<RegisterBlock loading />);
    expect(screen.getByText('Creating account...')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Creating account...' }),
    ).toBeDisabled();
  });

  it('renders login link', () => {
    render(<RegisterBlock loginHref="/signin" loginLabel="Sign in here" />);
    const link = screen.getByText('Sign in here');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/signin');
  });

  it('renders password requirements', () => {
    const requirements = ['At least 8 characters', 'One uppercase letter'];
    render(<RegisterBlock passwordRequirements={requirements} />);
    expect(screen.getByText('At least 8 characters')).toBeInTheDocument();
    expect(screen.getByText('One uppercase letter')).toBeInTheDocument();
  });
});
