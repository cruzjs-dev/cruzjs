import { Fragment } from 'react';
import { Link } from 'react-router';

type Tab = {
  path: string;
  label: string;
  icon: string;
};

type TabNavigationProps = {
  tabs: Tab[];
  currentTab: string;
  basePath?: string;
  onTabChange?: (tabPath: string) => void;
  renderLink?: (props: {
    to: string;
    children: React.ReactNode;
    className: string;
    style: React.CSSProperties;
  }) => React.ReactNode;
};

const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  currentTab,
  basePath,
  onTabChange,
  renderLink,
}) => {
  return (
    <div className="bg-surface-light rounded-xl border border-surface-border p-1.5">
      <nav className="flex gap-1">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.path;
          const className =
            'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all';
          const style: React.CSSProperties = isActive
            ? { backgroundColor: 'var(--color-primary)', color: 'white' }
            : {};

          const tabContent = (
            <>
              <svg
                className={`w-4 h-4 ${!isActive ? 'text-text-muted' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d={tab.icon}
                />
              </svg>
              <span
                className={`hidden sm:inline ${!isActive ? 'text-text hover:text-primary' : ''}`}
              >
                {tab.label}
              </span>
            </>
          );

          if (renderLink) {
            const to = basePath ? `${basePath}/${tab.path}` : tab.path;
            return (
              <Fragment key={tab.path}>
                {renderLink({ to, children: tabContent, className, style })}
              </Fragment>
            );
          }

          if (basePath) {
            return (
              <Link
                key={tab.path}
                to={`${basePath}/${tab.path}`}
                className={className}
                style={style}
              >
                {tabContent}
              </Link>
            );
          }

          return (
            <button
              key={tab.path}
              type="button"
              onClick={() => onTabChange?.(tab.path)}
              className={className}
              style={style}
            >
              {tabContent}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export { TabNavigation };
export type { Tab };
