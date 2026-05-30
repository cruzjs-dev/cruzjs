type PageHeaderProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
};

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, action, breadcrumbs }) => {
  return (
    <div className="flex items-start justify-between">
      <div>
        {breadcrumbs && (
          <div className="text-sm text-text-tertiary mb-1">{breadcrumbs}</div>
        )}
        <h2 className="text-xl font-bold text-text-strong mb-1">{title}</h2>
        {description && <p className="text-text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
};

export { PageHeader };

