import { useEffect, useCallback, useState } from 'react';

type ConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger' | 'destructive';
  isLoading?: boolean;
  confirmText?: string;
};

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  isLoading = false,
  confirmText,
}) => {
  const [confirmInput, setConfirmInput] = useState('');

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) onClose();
    },
    [onClose, isLoading],
  );

  useEffect(() => {
    if (!isOpen) {
      setConfirmInput('');
      return;
    }
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const isDestructive = variant === 'destructive';
  const isDanger = variant === 'danger';

  const confirmClasses =
    isDestructive || isDanger
      ? 'bg-danger hover:bg-danger-dark focus:ring-danger/30 text-white'
      : 'bg-primary hover:bg-primary-dark focus:ring-primary/30 text-white';

  const isConfirmDisabled =
    isLoading || (confirmText != null && confirmInput !== confirmText);

  const headerStyle = isDestructive
    ? { backgroundColor: 'color-mix(in srgb, var(--color-danger) 6%, var(--color-surface))' }
    : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={isLoading ? undefined : onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md rounded-xl bg-surface shadow-xl">
        <div
          className="flex items-center justify-between border-b border-surface-border px-6 py-4 rounded-t-xl"
          style={headerStyle}
        >
          <div className="flex items-center gap-2">
            {isDestructive && (
              <svg
                className="h-5 w-5 text-danger shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
            )}
            <h2 className="text-lg font-semibold text-text-strong">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg p-1 text-text-muted hover:text-text-strong hover:bg-surface-light transition-colors disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4">
          {children}
          {confirmText != null && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-text-muted mb-1.5">
                Type &quot;{confirmText}&quot; to confirm
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm text-text bg-surface transition-colors focus:outline-none focus:ring-2"
                style={{
                  borderColor: 'color-mix(in srgb, var(--color-danger) 50%, transparent)',
                }}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-surface-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg px-4 py-2 text-sm font-medium text-text hover:bg-surface-light transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 inline-flex items-center gap-2 ${confirmClasses}`}
          >
            {isLoading && (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export { ConfirmModal };
