import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ForgotPasswordBlock } from './ForgotPasswordBlock';

describe('ForgotPasswordBlock', () => {
  it('renders title and description', () => {
    render(<ForgotPasswordBlock />);
    expect(screen.getByText('Forgot password?')).toBeInTheDocument();
    expect(screen.getByText("Enter your email and we'll send you a reset link")).toBeInTheDocument();
  });

  it('renders email input', () => {
    render(<ForgotPasswordBlock />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
  });

  it('calls onSubmit with email', () => {
    const onSubmit = vi.fn();
    render(<ForgotPasswordBlock onSubmit={onSubmit} />);

    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Send reset link' }));

    expect(onSubmit).toHaveBeenCalledWith('test@example.com');
  });

  it('shows success state', () => {
    render(<ForgotPasswordBlock success />);
    expect(screen.getByText('Check your email for a reset link')).toBeInTheDocument();
    // Form should not be visible
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  });

  it('renders error message', () => {
    render(<ForgotPasswordBlock error="User not found" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('User not found');
  });

  it('shows loading state', () => {
    render(<ForgotPasswordBlock loading />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Sending...');
    expect(screen.getByLabelText('Email')).toBeDisabled();
  });

  it('renders back link', () => {
    render(<ForgotPasswordBlock backHref="/login" />);
    const link = screen.getByText('Back to sign in');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/login');
  });

  it('renders custom title and description', () => {
    render(
      <ForgotPasswordBlock
        title="Reset your password"
        description="We will email you instructions"
      />,
    );
    expect(screen.getByText('Reset your password')).toBeInTheDocument();
    expect(screen.getByText('We will email you instructions')).toBeInTheDocument();
  });

  it('renders custom success message', () => {
    render(<ForgotPasswordBlock success successMessage="Email sent!" />);
    expect(screen.getByText('Email sent!')).toBeInTheDocument();
  });

  it('renders custom back label', () => {
    render(<ForgotPasswordBlock backHref="/login" backLabel="Go back" />);
    expect(screen.getByText('Go back')).toBeInTheDocument();
  });

  it('uses renderLink for back link', () => {
    const renderLink = vi.fn(({ href, children, className }) => (
      <span data-testid="custom-link" data-href={href} className={className}>
        {children}
      </span>
    ));

    render(<ForgotPasswordBlock backHref="/login" renderLink={renderLink} />);
    expect(renderLink).toHaveBeenCalled();
    expect(screen.getByTestId('custom-link')).toBeInTheDocument();
  });

  it('renders logo', () => {
    render(<ForgotPasswordBlock logo={<div data-testid="logo">Logo</div>} />);
    expect(screen.getByTestId('logo')).toBeInTheDocument();
  });
});
