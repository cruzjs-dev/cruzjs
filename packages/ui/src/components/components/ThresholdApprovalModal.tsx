import React, { useState, useMemo } from 'react';

export type ThresholdApprovalModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onApprove: (threshold: number) => Promise<void>;
  leadScores: (number | null)[];
  currentFilter?: string;
  getCountForThreshold?: (threshold: number) => Promise<number>;
  totalMatchingCount?: number;
};

export const ThresholdApprovalModal: React.FC<ThresholdApprovalModalProps> = ({
  isOpen,
  onClose,
  onApprove,
  leadScores,
  currentFilter,
  getCountForThreshold,
  totalMatchingCount,
}) => {
  const [threshold, setThreshold] = useState(70);
  const [isLoading, setIsLoading] = useState(false);
  const [serverCount, setServerCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(false);

  const localLeadsAboveThreshold = useMemo(() => {
    return leadScores.filter((score) => score !== null && score >= threshold).length;
  }, [leadScores, threshold]);

  const leadsAboveThreshold = serverCount !== null ? serverCount : localLeadsAboveThreshold;

  React.useEffect(() => {
    if (!getCountForThreshold || !isOpen) return;

    let cancelled = false;
    setIsLoadingCount(true);

    getCountForThreshold(threshold)
      .then((count) => {
        if (!cancelled) {
          setServerCount(count);
          setIsLoadingCount(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setServerCount(null);
          setIsLoadingCount(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [threshold, getCountForThreshold, isOpen]);

  React.useEffect(() => {
    if (!isOpen) {
      setServerCount(null);
    }
  }, [isOpen]);

  const scoreDistribution = useMemo(() => {
    const ranges = [
      { min: 0, max: 39, label: '0-39', color: 'var(--color-danger)' },
      { min: 40, max: 69, label: '40-69', color: 'var(--color-warning)' },
      { min: 70, max: 100, label: '70-100', color: 'var(--color-success)' },
    ];

    return ranges.map((range) => {
      const count = leadScores.filter(
        (score) => score !== null && score >= range.min && score <= range.max
      ).length;
      return { ...range, count };
    });
  }, [leadScores]);

  const totalWithScores = leadScores.filter((s) => s !== null).length;

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await onApprove(threshold);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={onClose}
      />

      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '480px',
          backgroundColor: 'var(--color-surface)',
          borderRadius: '20px',
          boxShadow: '0 25px 80px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          animation: 'modalIn 200ms ease-out',
        }}
      >
        <div
          style={{
            padding: '24px 24px 0',
            borderBottom: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--color-success) 0%, var(--color-success-dark) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <path d="M22 4L12 14.01l-3-3" />
              </svg>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--color-text-strong)' }}>
                Bulk Approve by Score
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--color-text-tertiary)' }}>
                Approve all leads above a score threshold
              </p>
            </div>
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          {currentFilter && (
            <div
              style={{
                marginBottom: '20px',
                padding: '12px 16px',
                backgroundColor: 'var(--color-info-subtle)',
                borderRadius: '10px',
                border: '1px solid var(--color-info)',
              }}
            >
              <div style={{ fontSize: '13px', color: 'var(--color-info)' }}>
                <strong>Note:</strong> This will apply to {currentFilter}
              </div>
            </div>
          )}

          <div style={{ marginBottom: '24px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Minimum Score Threshold
              </span>
              <span
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: threshold >= 70 ? 'var(--color-success)' : threshold >= 40 ? 'var(--color-warning)' : 'var(--color-danger)',
                }}
              >
                {threshold}
              </span>
            </div>

            <div style={{ position: 'relative', padding: '10px 0' }}>
              <input
                type="range"
                min="0"
                max="100"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  appearance: 'none',
                  backgroundColor: 'var(--color-surface-border)',
                  borderRadius: '4px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: 0,
                  width: `${threshold}%`,
                  height: '8px',
                  background: `linear-gradient(90deg, var(--color-danger) 0%, var(--color-warning) 40%, var(--color-success) 70%)`,
                  backgroundSize: '100% 100%',
                  borderRadius: '4px',
                  pointerEvents: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              {[50, 60, 70, 80, 90].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setThreshold(preset)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: threshold === preset ? 'var(--color-surface)' : 'var(--color-text-tertiary)',
                    backgroundColor: threshold === preset ? 'var(--color-primary)' : 'var(--color-surface-lighter)',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    if (threshold !== preset) {
                      e.currentTarget.style.backgroundColor = 'var(--color-surface-border)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (threshold !== preset) {
                      e.currentTarget.style.backgroundColor = 'var(--color-surface-lighter)';
                    }
                  }}
                >
                  {preset}+
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              padding: '16px 20px',
              background: 'linear-gradient(135deg, var(--color-success-subtle) 0%, var(--color-success-bg) 100%)',
              borderRadius: '12px',
              border: '1px solid var(--color-success-border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--color-success-text)', fontWeight: 500 }}>
                  Leads to approve
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-success-dark)', marginTop: '2px' }}>
                  Score {threshold} or higher
                </div>
              </div>
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: 700,
                  color: 'var(--color-success-dark)',
                }}
              >
                {leadsAboveThreshold}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '16px 24px 24px',
            display: 'flex',
            gap: '12px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              backgroundColor: 'var(--color-surface-lighter)',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-border)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-lighter)')}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={isLoading || leadsAboveThreshold === 0}
            style={{
              flex: 2,
              padding: '12px',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--color-surface)',
              background: leadsAboveThreshold > 0
                ? 'linear-gradient(135deg, var(--color-success) 0%, var(--color-success-dark) 100%)'
                : 'var(--color-text-muted)',
              border: 'none',
              borderRadius: '10px',
              cursor: isLoading || leadsAboveThreshold === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 150ms ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: isLoading ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isLoading && leadsAboveThreshold > 0) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px color-mix(in srgb, var(--color-success) 40%, transparent)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {isLoading ? (
              <>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ animation: 'spin 1s linear infinite' }}
                >
                  <circle cx="12" cy="12" r="10" opacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
                Approving...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Approve {leadsAboveThreshold} Leads
              </>
            )}
          </button>
        </div>

        <style>{`
          @keyframes modalIn {
            from {
              opacity: 0;
              transform: scale(0.95) translateY(10px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          input[type="range"]::-webkit-slider-thumb {
            appearance: none;
            width: 24px;
            height: 24px;
            background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 2px 8px color-mix(in srgb, var(--color-primary) 40%, transparent);
            border: 3px solid var(--color-surface);
            position: relative;
            z-index: 10;
          }
          input[type="range"]::-moz-range-thumb {
            width: 24px;
            height: 24px;
            background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 2px 8px color-mix(in srgb, var(--color-primary) 40%, transparent);
            border: 3px solid var(--color-surface);
          }
        `}</style>
      </div>
    </div>
  );
};

export default ThresholdApprovalModal;
