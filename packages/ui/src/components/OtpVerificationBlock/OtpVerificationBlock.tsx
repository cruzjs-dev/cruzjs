import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { PinInput } from '../PinInput';

// ─── Types ────────────────────────────────────────────────────────────────────

export type OtpVerificationBlockProps = React.HTMLAttributes<HTMLDivElement> & {
  title?: string;
  description?: string;
  email?: string;
  codeLength?: number;
  onSubmit?: (code: string) => void;
  onResend?: () => void;
  resendCooldown?: number;
  loading?: boolean;
  error?: string;
  logo?: React.ReactNode;
};

// ─── Component ────────────────────────────────────────────────────────────────

export const OtpVerificationBlock = forwardRef<HTMLDivElement, OtpVerificationBlockProps>(
  function OtpVerificationBlock(
    {
      title = 'Verify your email',
      description = 'We sent a code to your email',
      email,
      codeLength = 6,
      onSubmit,
      onResend,
      resendCooldown = 60,
      loading = false,
      error,
      logo,
      className,
      ...rest
    },
    ref,
  ) {
    const [code, setCode] = useState('');
    const [countdown, setCountdown] = useState(resendCooldown);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const isCodeComplete = code.length === codeLength;
    const isResendReady = countdown <= 0;

    // Countdown timer
    useEffect(() => {
      if (countdown <= 0) {
        return;
      }

      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }, [countdown]);

    const handleResend = useCallback(() => {
      if (!isResendReady) {
        return;
      }
      setCountdown(resendCooldown);
      onResend?.();
    }, [isResendReady, resendCooldown, onResend]);

    const handleSubmit = useCallback(
      (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isCodeComplete) {
          onSubmit?.(code);
        }
      },
      [isCodeComplete, code, onSubmit],
    );

    const handleComplete = useCallback(
      (completedCode: string) => {
        onSubmit?.(completedCode);
      },
      [onSubmit],
    );

    const handleChange = useCallback((value: string) => {
      setCode(value);
    }, []);

    return (
      <div
        ref={ref}
        className={['max-w-sm w-full mx-auto text-center', className].filter(Boolean).join(' ')}
        {...rest}
      >
        {logo && <div className="flex justify-center mb-6">{logo}</div>}

        <h1 className="text-2xl font-bold text-text tracking-tight">{title}</h1>
        <p className="text-sm text-text-secondary mt-1">
          {description}
          {email && (
            <>
              {' '}
              <span className="font-semibold text-text">{email}</span>
            </>
          )}
        </p>

        <form onSubmit={handleSubmit} className="mt-6">
          <div className="flex justify-center">
            <PinInput
              length={codeLength}
              onChange={handleChange}
              onComplete={handleComplete}
              disabled={loading}
              type="number"
              autoFocus
            />
          </div>

          {error && (
            <div className="mt-4 text-sm text-danger bg-danger-subtle rounded-xl px-4 py-3" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!isCodeComplete || loading}
            className={[
              'w-full h-10 px-4 text-sm font-medium rounded-xl transition-all duration-200 mt-6',
              'bg-primary text-primary-foreground hover:bg-primary-dark',
              'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2',
              !isCodeComplete || loading ? 'opacity-50 cursor-not-allowed' : '',
            ].filter(Boolean).join(' ')}
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>

        <div className="mt-6">
          <span className="text-sm text-text-muted">
            {"Didn't receive a code? "}
          </span>
          {isResendReady ? (
            <button
              type="button"
              onClick={handleResend}
              className="text-sm text-primary cursor-pointer hover:text-primary-dark transition-colors font-medium"
            >
              Resend
            </button>
          ) : (
            <span className="text-sm text-text-muted">
              Resend in {countdown}s
            </span>
          )}
        </div>
      </div>
    );
  },
);

OtpVerificationBlock.displayName = 'OtpVerificationBlock';
