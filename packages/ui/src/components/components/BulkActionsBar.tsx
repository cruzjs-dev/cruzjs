import React, { useState, useEffect } from 'react';

export type BulkAction = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'success' | 'danger' | 'secondary';
  onClick: () => void | Promise<void>;
};

export type BulkActionsBarProps = {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  actions: BulkAction[];
  isAllSelected?: boolean;
  className?: string;
};

const variantStyles: Record<string, { bg: string; hoverBg: string; text: string; border: string }> = {
  primary: {
    bg: 'var(--color-primary)',
    hoverBg: 'var(--color-primary-dark)',
    text: 'var(--color-surface)',
    border: 'var(--color-primary)',
  },
  success: {
    bg: 'var(--color-success)',
    hoverBg: 'var(--color-success-dark)',
    text: 'var(--color-surface)',
    border: 'var(--color-success)',
  },
  danger: {
    bg: 'var(--color-danger)',
    hoverBg: 'var(--color-danger-dark)',
    text: 'var(--color-surface)',
    border: 'var(--color-danger)',
  },
  secondary: {
    bg: 'var(--color-surface)',
    hoverBg: 'var(--color-surface-light)',
    text: 'var(--color-text-secondary)',
    border: 'var(--color-surface-border)',
  },
};

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  actions,
  isAllSelected = false,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCount > 0) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [selectedCount]);

  if (!isVisible && selectedCount === 0) return null;

  const handleAction = async (action: BulkAction) => {
    setLoadingAction(action.id);
    try {
      await action.onClick();
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div
      className={className}
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: `translateX(-50%) translateY(${selectedCount > 0 ? '0' : '100px'})`,
        opacity: selectedCount > 0 ? 1 : 0,
        transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 100,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '12px 20px',
          backgroundColor: 'var(--color-dark-surface)',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1) inset',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              backgroundColor: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulse 2s infinite',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>

          <div>
            <div style={{ color: 'var(--color-dark-text)', fontSize: '14px', fontWeight: 600 }}>
              {selectedCount} selected
            </div>
            <div style={{ color: 'var(--color-dark-text-muted)', fontSize: '12px' }}>
              of {totalCount} leads
            </div>
          </div>
        </div>

        <div style={{ width: '1px', height: '32px', backgroundColor: 'var(--color-dark-border)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!isAllSelected ? (
            <button
              type="button"
              onClick={onSelectAll}
              style={{
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--color-dark-text-muted)',
                backgroundColor: 'transparent',
                border: '1px solid var(--color-dark-border)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-dark-text)';
                e.currentTarget.style.borderColor = 'var(--color-text-secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-dark-text-muted)';
                e.currentTarget.style.borderColor = 'var(--color-dark-border)';
              }}
            >
              Select all {totalCount}
            </button>
          ) : (
            <span style={{ fontSize: '13px', color: 'var(--color-success)', fontWeight: 500 }}>
              All selected
            </span>
          )}

          <button
            type="button"
            onClick={onClearSelection}
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--color-dark-text-muted)',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-dark-text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-dark-text-muted)')}
          >
            Clear
          </button>
        </div>

        <div style={{ width: '1px', height: '32px', backgroundColor: 'var(--color-dark-border)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {actions.map((action) => {
            const variant = variantStyles[action.variant || 'secondary'];
            const isLoading = loadingAction === action.id;

            return (
              <button
                key={action.id}
                type="button"
                onClick={() => handleAction(action)}
                disabled={isLoading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: variant.text,
                  backgroundColor: variant.bg,
                  border: `1px solid ${variant.border}`,
                  borderRadius: '10px',
                  cursor: isLoading ? 'wait' : 'pointer',
                  transition: 'all 150ms ease',
                  opacity: isLoading ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.backgroundColor = variant.hoverBg;
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = variant.bg;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {isLoading ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ animation: 'spin 1s linear infinite' }}
                  >
                    <circle cx="12" cy="12" r="10" opacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                ) : (
                  action.icon
                )}
                {action.label}
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default BulkActionsBar;
