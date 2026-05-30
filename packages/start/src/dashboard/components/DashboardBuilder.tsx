import { useState, useCallback, useRef, useEffect } from 'react';
import { createId } from '@paralleldrive/cuid2';
import { getTRPC } from '@cruzjs/core/trpc/client';
import { DashboardGrid } from './DashboardGrid';

interface Widget {
  id: string;
  type: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  config: Record<string, unknown>;
}

interface DashboardBuilderProps {
  dashboardId: string;
  initialWidgets: Widget[];
  dashboardName: string;
}

const WIDGET_PRESETS = [
  { type: 'STAT', title: 'Total Executions', w: 3, h: 2, config: { metric: 'TOTAL_EXECUTIONS' } },
  { type: 'STAT', title: 'Active Agents', w: 3, h: 2, config: { metric: 'ACTIVE_AGENTS' } },
  { type: 'STAT', title: 'Pending Gates', w: 3, h: 2, config: { metric: 'OPEN_GATES' } },
  { type: 'STAT', title: 'Failure Rate', w: 3, h: 2, config: { metric: 'FAILURE_RATE' } },
  { type: 'STAT', title: 'Open Work Items', w: 3, h: 2, config: { metric: 'OPEN_WORK_ITEMS' } },
  { type: 'STAT', title: 'Completed Items', w: 3, h: 2, config: { metric: 'COMPLETED_WORK_ITEMS' } },
  { type: 'CHART', title: 'Cost Trend', w: 6, h: 3, config: { chartType: 'LINE', metricType: 'COST_DAILY', periodDays: 30 } },
  { type: 'CHART', title: 'Execution Volume', w: 6, h: 3, config: { chartType: 'BAR', metricType: 'COST_EXECUTION', periodDays: 30 } },
  { type: 'LIST', title: 'Recent Executions', w: 6, h: 3, config: { listMetric: 'RECENT_EXECUTIONS', limit: 10 } },
  { type: 'LIST', title: 'Recent Failures', w: 6, h: 3, config: { listMetric: 'RECENT_FAILURES', limit: 10 } },
  { type: 'LIST', title: 'Pending Reviews', w: 6, h: 3, config: { listMetric: 'PENDING_GATES', limit: 10 } },
  { type: 'LIST', title: 'Overdue Items', w: 6, h: 3, config: { listMetric: 'OVERDUE_WORK_ITEMS', limit: 10 } },
  { type: 'FEED', title: 'Activity Feed', w: 6, h: 4, config: { limit: 20 } },
];

/**
 * DashboardBuilder
 *
 * Edit mode toggle, add widget menu, and save layout functionality.
 * Uses DashboardGrid for drag-and-drop widget reordering.
 */
export const DashboardBuilder: React.FC<DashboardBuilderProps> = ({
  dashboardId,
  initialWidgets,
  dashboardName,
}) => {
  const trpc = getTRPC();
  const [isEditMode, setIsEditMode] = useState(false);
  const [widgets, setWidgets] = useState<Widget[]>(initialWidgets);
  const [hasChanges, setHasChanges] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), toastMessage.type === 'success' ? 2000 : 5000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const updateMutation = trpc.dashboard.update.useMutation({
    onSuccess: () => {
      setToastMessage({ text: 'Dashboard saved', type: 'success' });
      setHasChanges(false);
    },
    onError: (error: any) => {
      setToastMessage({ text: error.message || 'Failed to save dashboard', type: 'error' });
    },
  });

  const handleAddWidget = useCallback(
    (preset: (typeof WIDGET_PRESETS)[number]) => {
      const newWidget: Widget = {
        id: createId(),
        type: preset.type,
        title: preset.title,
        x: 0,
        y: widgets.length > 0 ? Math.max(...widgets.map((w) => w.y + w.h)) : 0,
        w: preset.w,
        h: preset.h,
        config: preset.config,
      };
      setWidgets((prev) => [...prev, newWidget]);
      setHasChanges(true);
      setMenuOpen(false);
    },
    [widgets]
  );

  const handleReorder = useCallback((reordered: Widget[]) => {
    setWidgets(reordered);
    setHasChanges(true);
  }, []);

  const handleRemoveWidget = useCallback((widgetId: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== widgetId));
    setHasChanges(true);
  }, []);

  const handleSave = () => {
    updateMutation.mutate({
      dashboardId,
      widgets: widgets as any,
    });
  };

  const handleCancel = () => {
    setWidgets(initialWidgets);
    setIsEditMode(false);
    setHasChanges(false);
  };

  return (
    <div>
      {/* Toast */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
            toastMessage.type === 'success'
              ? 'bg-primary text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toastMessage.text}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-lg font-semibold text-text-strong">
          {dashboardName}
        </p>
        <div className="flex items-center gap-2">
          {isEditMode ? (
            <>
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm border border-surface-border rounded-md text-text hover:bg-surface-light transition-colors"
                  onClick={() => setMenuOpen((prev) => !prev)}
                >
                  Add Widget
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-1 z-20 w-64 max-h-[300px] overflow-y-auto rounded-md border border-surface-border bg-surface shadow-lg">
                    {WIDGET_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-surface-light transition-colors"
                        onClick={() => handleAddWidget(preset)}
                      >
                        <span className="text-xs font-bold text-text-muted min-w-[40px]">
                          {preset.type}
                        </span>
                        <span className="text-sm text-text">{preset.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {hasChanges && (
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-50"
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              )}
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded-md text-text-muted hover:bg-surface-light transition-colors"
                onClick={handleCancel}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              className="px-3 py-1.5 text-sm border border-surface-border rounded-md text-text hover:bg-surface-light transition-colors"
              onClick={() => setIsEditMode(true)}
            >
              Edit Dashboard
            </button>
          )}
        </div>
      </div>

      {/* Widget Grid */}
      {widgets.length > 0 ? (
        <DashboardGrid
          widgets={widgets}
          isEditMode={isEditMode}
          onReorder={handleReorder}
          onRemoveWidget={handleRemoveWidget}
        />
      ) : (
        <div className="p-12 text-center border-2 border-dashed border-surface-border rounded-md">
          <p className="text-text-muted mb-3">
            No widgets yet. {isEditMode ? 'Add widgets from the menu above.' : 'Click "Edit Dashboard" to get started.'}
          </p>
          {!isEditMode && (
            <button
              type="button"
              className="px-3 py-1.5 text-sm border border-surface-border rounded-md text-text hover:bg-surface-light transition-colors"
              onClick={() => setIsEditMode(true)}
            >
              Edit Dashboard
            </button>
          )}
        </div>
      )}
    </div>
  );
};
