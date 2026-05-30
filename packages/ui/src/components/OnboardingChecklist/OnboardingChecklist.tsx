import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type OnboardingTask = {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  icon?: React.ReactNode;
  action?: { label: string; onClick: () => void } | { label: string; href: string };
};

export type OnboardingChecklistProps = React.HTMLAttributes<HTMLDivElement> & {
  title?: string;
  description?: string;
  tasks: OnboardingTask[];
  onTaskToggle?: (taskId: string, completed: boolean) => void;
  onDismiss?: () => void;
  collapsible?: boolean;
  defaultExpanded?: boolean;
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const ChevronIcon: React.FC<{ rotated: boolean }> = ({ rotated }) => (
  <svg
    className="w-4 h-4 shrink-0 text-text-tertiary transition-transform duration-300"
    style={{
      transform: rotated ? 'rotate(180deg)' : 'rotate(0deg)',
      transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    }}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const DismissIcon: React.FC = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const CheckmarkIcon: React.FC = () => (
  <svg
    className="w-3 h-3"
    viewBox="0 0 12 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M2.5 6.5L5 9L9.5 3.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CelebrationIcon: React.FC = () => (
  <svg
    className="w-6 h-6 text-success"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// ─── Task Row ─────────────────────────────────────────────────────────────────

type TaskRowProps = {
  task: OnboardingTask;
  onToggle?: (taskId: string, completed: boolean) => void;
};

function isHrefAction(action: OnboardingTask['action']): action is { label: string; href: string } {
  return action !== undefined && 'href' in action;
}

const TaskRow: React.FC<TaskRowProps> = ({ task, onToggle }) => {
  const handleToggle = useCallback(() => {
    onToggle?.(task.id, !task.completed);
  }, [onToggle, task.id, task.completed]);

  return (
    <div
      className={[
        'flex items-start gap-3 px-3 py-2.5',
        'hover:bg-surface-lighter rounded-lg transition-colors cursor-pointer',
      ].join(' ')}
      onClick={handleToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleToggle();
        }
      }}
    >
      {/* Checkbox circle */}
      <div className="mt-0.5 shrink-0">
        {task.completed ? (
          <span
            className="flex items-center justify-center w-5 h-5 rounded-full bg-success text-surface"
            style={{
              animation: 'onboarding-check-pop 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            aria-hidden="true"
          >
            <CheckmarkIcon />
          </span>
        ) : (
          <span
            className="flex items-center justify-center w-5 h-5 rounded-full ring-2 ring-surface-border"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {task.icon && (
            <span className="shrink-0 text-text-tertiary">{task.icon}</span>
          )}
          <span
            className={[
              'text-sm',
              task.completed ? 'text-text-tertiary line-through' : 'text-text',
            ].join(' ')}
          >
            {task.title}
          </span>
        </div>
        {task.description && (
          <p
            className={[
              'text-xs mt-0.5',
              task.completed ? 'text-text-tertiary' : 'text-text-secondary',
            ].join(' ')}
          >
            {task.description}
          </p>
        )}
      </div>

      {/* Action button/link */}
      {task.action && !task.completed && (
        <div className="shrink-0 mt-0.5">
          {isHrefAction(task.action) ? (
            <a
              href={task.action.href}
              className="text-primary text-xs font-medium hover:text-primary-dark transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {task.action.label}
            </a>
          ) : (
            <button
              type="button"
              className="text-primary text-xs font-medium hover:text-primary-dark transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                task.action && 'onClick' in task.action && task.action.onClick();
              }}
            >
              {task.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const OnboardingChecklist = forwardRef<HTMLDivElement, OnboardingChecklistProps>(
  function OnboardingChecklist(
    {
      title = 'Getting Started',
      description,
      tasks,
      onTaskToggle,
      onDismiss,
      collapsible = true,
      defaultExpanded = true,
      className,
      ...rest
    },
    ref,
  ) {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const contentRef = useRef<HTMLDivElement>(null);
    const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);

    const completedCount = tasks.filter((t) => t.completed).length;
    const totalCount = tasks.length;
    const allComplete = totalCount > 0 && completedCount === totalCount;
    const percent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    useEffect(() => {
      if (contentRef.current) {
        setContentHeight(contentRef.current.scrollHeight);
      }
    }, [tasks, expanded]);

    const toggleExpanded = useCallback(() => {
      if (collapsible) {
        setExpanded((prev) => !prev);
      }
    }, [collapsible]);

    return (
      <div
        ref={ref}
        className={[
          'bg-surface rounded-2xl ring-1 ring-surface-border/50',
          'shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.04)]',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-center gap-3">
            {/* Title + chevron */}
            <div className="flex-1 min-w-0">
              <button
                type="button"
                className={[
                  'flex items-center gap-2 text-left',
                  collapsible ? 'cursor-pointer' : 'cursor-default',
                ].join(' ')}
                onClick={toggleExpanded}
                aria-expanded={expanded}
                disabled={!collapsible}
              >
                {collapsible && <ChevronIcon rotated={!expanded} />}
                <h3 className="font-semibold text-text">{title}</h3>
              </button>
              {description && (
                <p className="text-xs text-text-tertiary mt-1">{description}</p>
              )}
            </div>

            {/* Dismiss button */}
            {onDismiss && (
              <button
                type="button"
                className="shrink-0 p-1.5 rounded-lg text-text-tertiary hover:text-text hover:bg-surface-lighter transition-colors"
                onClick={onDismiss}
                aria-label="Dismiss"
              >
                <DismissIcon />
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-text-tertiary">
                {completedCount} of {totalCount} complete
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-lighter overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{
                  width: `${percent}%`,
                  transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Collapsible content */}
        <div
          style={{
            height: expanded ? contentHeight : 0,
            opacity: expanded ? 1 : 0,
            transition: 'height 300ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms ease',
            overflow: 'hidden',
          }}
        >
          <div ref={contentRef} className="px-2 pb-3">
            {allComplete ? (
              <div className="flex items-center gap-3 px-3 py-4 text-center justify-center">
                <CelebrationIcon />
                <span className="text-sm font-medium text-success">All done!</span>
              </div>
            ) : (
              <div className="space-y-0.5">
                {tasks.map((task) => (
                  <TaskRow key={task.id} task={task} onToggle={onTaskToggle} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Animation keyframe */}
        <style>{`
          @keyframes onboarding-check-pop {
            0% { transform: scale(0.5); opacity: 0; }
            60% { transform: scale(1.15); }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    );
  },
);

OnboardingChecklist.displayName = 'OnboardingChecklist';
