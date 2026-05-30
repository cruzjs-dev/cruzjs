import React, { forwardRef } from 'react';

export type ApiKeyCardStatus = 'active' | 'expired' | 'revoked';

export type ApiKeyCardProps = React.HTMLAttributes<HTMLDivElement> & {
  name: string;
  keyValue: string;
  masked?: boolean;
  createdAt: string;
  lastUsed?: string;
  expiresAt?: string;
  status?: ApiKeyCardStatus;
  scopes?: string[];
  onCopy?: () => void;
  onRevoke?: () => void;
  onRegenerate?: () => void;
  onToggleMask?: () => void;
};

const statusBadgeStyles: Record<ApiKeyCardStatus, string> = {
  active: 'bg-success-subtle text-success-text',
  expired: 'bg-warning-subtle text-warning-text',
  revoked: 'bg-danger-subtle text-danger-text',
};

const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
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
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon: React.FC<{ className?: string }> = ({ className }) => (
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
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const CopyIcon: React.FC<{ className?: string }> = ({ className }) => (
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

function maskKey(key: string): string {
  const lastFour = key.slice(-4);
  return `••••••••${lastFour}`;
}

function StatusBadge({ status }: { status: ApiKeyCardStatus }) {
  return (
    <span
      className={[
        'text-[11px] font-medium rounded-full px-2 py-0.5 capitalize',
        statusBadgeStyles[status],
      ].join(' ')}
    >
      {status}
    </span>
  );
}

function MetadataRow({
  createdAt,
  lastUsed,
  expiresAt,
}: {
  createdAt: string;
  lastUsed?: string;
  expiresAt?: string;
}) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-text-muted mt-3">
      <span>
        <span className="text-text-tertiary">Created </span>
        {createdAt}
      </span>
      {lastUsed !== undefined && (
        <span>
          <span className="text-text-tertiary">Last used </span>
          {lastUsed}
        </span>
      )}
      {expiresAt !== undefined && (
        <span>
          <span className="text-text-tertiary">Expires </span>
          {expiresAt}
        </span>
      )}
    </div>
  );
}

function ScopesBadges({ scopes }: { scopes: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {scopes.map((scope) => (
        <span
          key={scope}
          className="bg-surface-lighter text-text-tertiary text-[11px] rounded-md px-1.5 py-0.5 font-mono"
        >
          {scope}
        </span>
      ))}
    </div>
  );
}

export const ApiKeyCard = forwardRef<HTMLDivElement, ApiKeyCardProps>(function ApiKeyCard(
  {
    className,
    name,
    keyValue,
    masked = true,
    createdAt,
    lastUsed,
    expiresAt,
    status = 'active',
    scopes,
    onCopy,
    onRevoke,
    onRegenerate,
    onToggleMask,
    ...divProps
  },
  ref,
) {
  const isRevoked = status === 'revoked';
  const displayKey = masked ? maskKey(keyValue) : keyValue;

  return (
    <div
      ref={ref}
      className={[
        'bg-surface rounded-xl ring-1 ring-surface-border/50 p-5 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.04)]',
        isRevoked && 'opacity-60',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...divProps}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm text-text">{name}</span>
        <StatusBadge status={status} />
      </div>

      {/* Key display */}
      <div className="flex items-center gap-2 mt-3">
        <div className="flex-1 bg-surface-lighter rounded-lg px-3 py-2 font-mono text-sm text-text-secondary truncate">
          {displayKey}
        </div>
        <button
          type="button"
          aria-label={masked ? 'Show key' : 'Hide key'}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-lighter transition-colors"
          onClick={onToggleMask}
        >
          {masked ? <EyeIcon className="w-4 h-4" /> : <EyeOffIcon className="w-4 h-4" />}
        </button>
        <button
          type="button"
          aria-label="Copy key"
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-lighter transition-colors"
          onClick={onCopy}
        >
          <CopyIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Metadata */}
      <MetadataRow createdAt={createdAt} lastUsed={lastUsed} expiresAt={expiresAt} />

      {/* Scopes */}
      {scopes && scopes.length > 0 && <ScopesBadges scopes={scopes} />}

      {/* Actions */}
      {!isRevoked && (onRevoke || onRegenerate) && (
        <div className="mt-4 pt-4 border-t border-surface-border/50 flex gap-3">
          {onRevoke && (
            <button
              type="button"
              className="text-danger text-xs hover:text-danger-dark font-medium transition-colors"
              onClick={onRevoke}
            >
              Revoke
            </button>
          )}
          {onRegenerate && (
            <button
              type="button"
              className="text-primary text-xs hover:text-primary-dark font-medium transition-colors"
              onClick={onRegenerate}
            >
              Regenerate
            </button>
          )}
        </div>
      )}
    </div>
  );
});

ApiKeyCard.displayName = 'ApiKeyCard';
