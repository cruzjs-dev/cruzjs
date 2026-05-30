type DetailRowProps = {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
};

const DetailRow: React.FC<DetailRowProps> = ({ icon, label, value, mono = false }) => {
  return (
    <div className="flex items-start gap-4">
      <div className="w-11 h-11 rounded-lg bg-surface-light border border-surface-border flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-muted font-medium uppercase tracking-wide mb-1">{label}</p>
        <p className={`text-base ${mono ? 'font-mono text-text' : 'font-semibold text-text-strong'} truncate`}>
          {value}
        </p>
      </div>
    </div>
  );
};

export { DetailRow };

