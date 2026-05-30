type SectionCardProps = {
  title?: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  variant?: 'default' | 'danger';
  className?: string;
};

const SectionCard: React.FC<SectionCardProps> = ({ 
  title, 
  children, 
  headerAction, 
  variant = 'default',
  className = '' 
}) => {
  const borderClass = variant === 'danger' ? 'border-red-200 border-2' : 'border-surface-border';
  const titleClass = variant === 'danger' ? 'text-red-600' : 'text-text';

  return (
    <div className={`rounded-xl border ${borderClass} bg-surface p-6 ${className}`}>
      {(title || headerAction) && (
        <div className="flex items-center justify-between mb-6">
          {title && (
            <h3 className={`text-sm font-semibold ${titleClass} uppercase tracking-wide`}>{title}</h3>
          )}
          {headerAction}
        </div>
      )}
      {children}
    </div>
  );
};

export { SectionCard };

