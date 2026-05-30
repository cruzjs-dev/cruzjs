import type { ColorVariant } from '../types';

type StatCardDelta = {
  value: number;
  label?: string;
};

type StatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  color?: ColorVariant;
  valueClassName?: string;
  delta?: StatCardDelta;
  trend?: 'up' | 'down' | 'neutral';
};

const colorConfig: Record<ColorVariant, { bg: string; shadow: string; hover: string; glow: string }> = {
  primary: { bg: 'bg-primary', shadow: 'shadow-primary/20', hover: 'hover:border-primary/30', glow: 'from-primary/5' },
  emerald: { bg: 'bg-emerald-500', shadow: 'shadow-emerald-500/20', hover: 'hover:border-emerald-200', glow: 'from-emerald-500/5' },
  cyan: { bg: 'bg-cyan-500', shadow: 'shadow-cyan-500/20', hover: 'hover:border-cyan-200', glow: 'from-cyan-500/5' },
  amber: { bg: 'bg-amber-500', shadow: 'shadow-amber-500/20', hover: 'hover:border-amber-200', glow: 'from-amber-500/5' },
  red: { bg: 'bg-red-500', shadow: 'shadow-red-500/20', hover: 'hover:border-red-200', glow: 'from-red-500/5' },
  purple: { bg: 'bg-purple-500', shadow: 'shadow-purple-500/20', hover: 'hover:border-purple-200', glow: 'from-purple-500/5' },
  slate: { bg: 'bg-primary', shadow: 'shadow-primary/20', hover: 'hover:border-surface-border', glow: 'from-primary/5' },
  blue: { bg: 'bg-blue-500', shadow: 'shadow-blue-500/20', hover: 'hover:border-blue-200', glow: 'from-blue-500/5' },
  green: { bg: 'bg-green-500', shadow: 'shadow-green-500/20', hover: 'hover:border-green-200', glow: 'from-green-500/5' },
  orange: { bg: 'bg-orange-500', shadow: 'shadow-orange-500/20', hover: 'hover:border-orange-200', glow: 'from-orange-500/5' },
  gray: { bg: 'bg-text-muted', shadow: 'shadow-text-muted/20', hover: 'hover:border-surface-border', glow: 'from-text-muted/5' },
};

const UpArrowIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M6 2.5L2.5 6.5H5V9.5H7V6.5H9.5L6 2.5Z" fill="currentColor" />
  </svg>
);

const DownArrowIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M6 9.5L9.5 5.5H7V2.5H5V5.5H2.5L6 9.5Z" fill="currentColor" />
  </svg>
);

const NeutralIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M2.5 6H9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const trendConfig = {
  up: { className: 'text-success-text', Icon: UpArrowIcon, prefix: '+' },
  down: { className: 'text-danger-text', Icon: DownArrowIcon, prefix: '-' },
  neutral: { className: 'text-text-muted', Icon: NeutralIcon, prefix: '' },
} as const;

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color = 'primary', valueClassName = 'text-text-strong', delta, trend }) => {
  const { bg, shadow, hover, glow } = colorConfig[color];
  const resolvedTrend = trend ?? (delta ? (delta.value > 0 ? 'up' : delta.value < 0 ? 'down' : 'neutral') : undefined);

  return (
    <div className={`group relative overflow-hidden rounded-xl bg-gradient-to-br from-surface-lighter to-surface-light border border-surface-border p-5 ${hover} transition-all`}>
      <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl ${glow} to-transparent rounded-full blur-xl group-hover:opacity-150 transition-all`} />
      <div className="relative">
        <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3 shadow-md ${shadow}`}>
          {icon}
        </div>
        <p className="text-xs text-text-muted font-medium uppercase tracking-wide mb-0.5">{label}</p>
        <p className={`text-2xl font-bold ${valueClassName}`}>{value}</p>
        {delta && resolvedTrend && (
          <div className={`flex items-center gap-1 mt-1 text-sm font-medium ${trendConfig[resolvedTrend].className}`}>
            {(() => {
              const { Icon, prefix } = trendConfig[resolvedTrend];
              return (
                <>
                  <Icon />
                  <span>{prefix}{Math.abs(delta.value)}%</span>
                </>
              );
            })()}
            {delta.label && (
              <span className="text-text-tertiary text-xs">{delta.label}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export { StatCard };

