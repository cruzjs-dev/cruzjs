type ActionItemProps = {
  icon: React.ReactNode;
  iconBgColor?: string;
  title: string;
  description: string;
  onClick: () => void;
};

const ActionItem: React.FC<ActionItemProps> = ({ 
  icon, 
  iconBgColor = 'bg-primary',
  title, 
  description, 
  onClick 
}) => {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-lighter transition-colors group"
    >
      <div className={`w-9 h-9 rounded-lg ${iconBgColor} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="text-sm font-medium text-text-strong">{title}</p>
        <p className="text-xs text-text-muted">{description}</p>
      </div>
      <svg className="w-4 h-4 text-surface-border group-hover:text-text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
};

export { ActionItem };

