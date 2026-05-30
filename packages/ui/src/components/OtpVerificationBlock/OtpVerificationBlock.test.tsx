import { fireEvent, render, screen, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { OtpVerificationBlock } from './OtpVerificationBlock';

describe('OtpVerificationBlock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders title and description', () => {
    render(<OtpVerificationBlock />);
    expect(screen.getByText('Verify your email')).toBeInTheDocument();
    expect(screen.getByText(/We sent a code to your email/)).toBeInTheDocument();
  });

  it('renders pin input fields', () => {
    render(<OtpVerificationBlock codeLength={6} />);
    const cells = screen.getAllByLabelText(/^PIN digit \d+ of 6$/);
    expect(cells).toHaveLength(6);
  });

  it('calls onSubmit with complete code', () => {
    const onSubmit = vi.fn();
    render(<OtpVerificationBlock codeLength={3} onSubmit={onSubmit} resendCooldown={0} />);
    const cells = screen.getAllByLabelText(/^PIN digit \d+ of 3$/);

    act(() => {
      fireEvent.focus(cells[0]);
      fireEvent.keyDown(cells[0], { key: '1' });
    });
    act(() => {
      fireEvent.keyDown(cells[1], { key: '2' });
    });
    act(() => {
      fireEvent.keyDown(cells[2], { key: '3' });
    });

    act(() => {
      vi.advanceTimersByTime(10);
    });
    expect(onSubmit).toHaveBeenCalledWith('123');
  });

  it('renders resend button', () => {
    render(<OtpVerificationBlock />);
    expect(screen.getByText(/Didn't receive a code\?/)).toBeInTheDocument();
  });

  it('calls onResend when clicked', () => {
    const onResend = vi.fn();
    render(<OtpVerificationBlock onResend={onResend} resendCooldown={0} />);

    const resendButton = screen.getByRole('button', { name: 'Resend' });
    fireEvent.click(resendButton);

    expect(onResend).toHaveBeenCalledTimes(1);
  });

  it('shows cooldown timer', () => {
    render(<OtpVerificationBlock resendCooldown={45} />);
    expect(screen.getByText('Resend in 45s')).toBeInTheDocument();
  });

  it('renders error message', () => {
    render(<OtpVerificationBlock error="Invalid code" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Invalid code');
  });

  it('shows loading state', () => {
    render(<OtpVerificationBlock loading />);
    const verifyButton = screen.getByRole('button', { name: 'Verifying...' });
    expect(verifyButton).toBeDisabled();
  });

  it('shows email in description', () => {
    render(<OtpVerificationBlock email="test@example.com" />);
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('disables verify button until code is complete', () => {
    render(<OtpVerificationBlock codeLength={6} />);
    const verifyButton = screen.getByRole('button', { name: 'Verify' });
    expect(verifyButton).toBeDisabled();
  });

  it('renders custom title and description', () => {
    render(
      <OtpVerificationBlock
        title="Enter your code"
        description="Check your inbox"
      />,
    );
    expect(screen.getByText('Enter your code')).toBeInTheDocument();
    expect(screen.getByText(/Check your inbox/)).toBeInTheDocument();
  });

  it('renders logo', () => {
    render(<OtpVerificationBlock logo={<div data-testid="logo">Logo</div>} />);
    expect(screen.getByTestId('logo')).toBeInTheDocument();
  });

  it('counts down and shows resend button when ready', () => {
    render(<OtpVerificationBlock resendCooldown={2} />);
    expect(screen.getByText('Resend in 2s')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('Resend in 1s')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('button', { name: 'Resend' })).toBeInTheDocument();
  });

  it('resets cooldown after resend', () => {
    const onResend = vi.fn();
    render(<OtpVerificationBlock resendCooldown={2} onResend={onResend} />);

    // Wait for cooldown to expire
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const resendButton = screen.getByRole('button', { name: 'Resend' });
    fireEvent.click(resendButton);

    expect(onResend).toHaveBeenCalled();
    expect(screen.getByText('Resend in 2s')).toBeInTheDocument();
  });
});
