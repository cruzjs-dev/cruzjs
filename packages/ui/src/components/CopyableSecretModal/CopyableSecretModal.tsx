import React, { forwardRef, useState, useCallback, useRef, useEffect } from 'react';
import { Modal } from '../Modal';

export type CopyableSecretModalProps = {
  open: boolean;
  onClose: () => void;
  secret: string;
  title?: string;
  description?: string;
  label?: string;
  metadata?: { label: string; value: string }[];
  requireCopy?: boolean;
  className?: string;
};

const WarningIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
      clipRule="evenodd"
    />
  </svg>
);

const ClipboardIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const CopyableSecretModal = forwardRef<HTMLDivElement, CopyableSecretModalProps>(
  function CopyableSecretModal(
    {
      open,
      onClose,
      secret,
      title = 'Secret Created',
      description = 'Copy this secret now. It won\'t be shown again.',
      label,
      metadata,
      requireCopy = true,
      className,
    },
    ref,
  ) {
    const [copied, setCopied] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      if (!open) {
        setCopied(false);
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      }
    }, [open]);

    useEffect(() => {
      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    }, []);

    const handleCopy = useCallback(async () => {
      try {
        await navigator.clipboard.writeText(secret);
        setCopied(true);

        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
          timerRef.current = null;
        }, 2000);
      } catch {
        // Clipboard API not available or permission denied
      }
    }, [secret]);

    const handleClose = useCallback(() => {
      if (requireCopy && !copied) {
        return;
      }
      onClose();
    }, [requireCopy, copied, onClose]);

    const canClose = !requireCopy || copied;

    return (
      <Modal
        ref={ref}
        open={open}
        onClose={handleClose}
        title={title}
        description={description}
        closeOnBackdrop={canClose}
        closeOnEscape={canClose}
        showCloseButton={false}
        size="md"
        className={className}
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              {requireCopy && !copied && (
                <p className="text-xs text-warning-text" data-testid="copy-hint">
                  You must copy the secret before closing
                </p>
              )}
            </div>
            <button
              type="button"
              disabled={!canClose}
              onClick={handleClose}
              className={[
                'shrink-0 rounded-xl px-5 py-2 text-sm font-medium transition-colors',
                canClose
                  ? 'bg-primary text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:brightness-110'
                  : 'bg-surface-lighter text-text-tertiary cursor-not-allowed',
              ].join(' ')}
            >
              Done
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {/* Warning alert */}
          <div
            className="flex items-start gap-3 rounded-xl p-3 ring-1 ring-warning/20"
            role="alert"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-warning) 6%, var(--color-surface))',
            }}
          >
            <span
              className="shrink-0 inline-flex items-center justify-center p-1.5 rounded-lg ring-1 ring-warning/20"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-warning) 10%, transparent)',
              }}
            >
              <WarningIcon className="w-4 h-4 text-warning-text" />
            </span>
            <p className="text-sm text-text-secondary leading-relaxed pt-px">
              This secret will only be shown once. Make sure to copy it.
            </p>
          </div>

          {/* Metadata key-value pairs */}
          {metadata && metadata.length > 0 && (
            <div className="flex flex-col gap-2">
              {metadata.map((item) => (
                <div key={item.label} className="flex items-baseline gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-text-tertiary shrink-0">
                    {item.label}
                  </span>
                  <span className="text-sm text-text-strong truncate">{item.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Secret display */}
          <div>
            {label && (
              <label className="block text-sm font-medium text-text-strong mb-1.5">{label}</label>
            )}
            <div className="relative rounded-xl ring-1 ring-surface-border bg-surface-light p-3 overflow-x-auto">
              <code
                className="block text-sm font-mono text-text-strong whitespace-nowrap pr-20"
                data-testid="secret-value"
              >
                {secret}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                aria-label={copied ? 'Copied' : 'Copy secret'}
                className={[
                  'absolute top-2 right-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors duration-150',
                  copied
                    ? 'text-success bg-success/10 ring-1 ring-success/20'
                    : 'text-text-secondary bg-surface ring-1 ring-surface-border hover:bg-surface-lighter',
                ].join(' ')}
              >
                <span
                  className="inline-flex transition-transform"
                  style={{
                    transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                    transitionDuration: '200ms',
                    transform: copied ? 'scale(1.15)' : 'scale(1)',
                  }}
                >
                  {copied ? (
                    <CheckIcon className="w-3.5 h-3.5" />
                  ) : (
                    <ClipboardIcon className="w-3.5 h-3.5" />
                  )}
                </span>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    );
  },
);

CopyableSecretModal.displayName = 'CopyableSecretModal';
