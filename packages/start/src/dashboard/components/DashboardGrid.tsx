import { useCallback } from 'react';
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { WidgetRenderer } from './WidgetRenderer';

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

interface DashboardGridProps {
  widgets: Widget[];
  isEditMode: boolean;
  onReorder: (widgets: Widget[]) => void;
  onRemoveWidget?: (widgetId: string) => void;
}

/**
 * SortableWidget
 *
 * Wraps each widget with @dnd-kit sortable behavior.
 * In edit mode, shows a drag handle and remove button.
 */
const SortableWidget: React.FC<{
  widget: Widget;
  isEditMode: boolean;
  onRemove?: () => void;
}> = ({ widget, isEditMode, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    gridColumn: `span ${widget.w}`,
    minHeight: `${widget.h * 80}px`,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {isEditMode && (
        <div className="absolute top-0 left-0 right-0 z-10 flex justify-between p-1">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab p-1 rounded-sm bg-surface-light opacity-80 hover:opacity-100 transition-opacity"
          >
            <svg className="w-4 h-4 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 8h16M4 16h16"
              />
            </svg>
          </div>
          {onRemove && (
            <button
              type="button"
              className="cursor-pointer p-1 rounded-sm bg-red-700 opacity-80 hover:opacity-100 transition-opacity"
              onClick={onRemove}
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      )}
      <WidgetRenderer widget={widget} />
    </div>
  );
};

/**
 * DashboardGrid
 *
 * 12-column CSS grid with @dnd-kit drag-and-drop for widget reordering.
 * Edit mode enables drag handles and remove buttons.
 */
export const DashboardGrid: React.FC<DashboardGridProps> = ({
  widgets,
  isEditMode,
  onReorder,
  onRemoveWidget,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = widgets.findIndex((w) => w.id === active.id);
      const newIndex = widgets.findIndex((w) => w.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = [...widgets];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      onReorder(reordered);
    },
    [widgets, onReorder]
  );

  const widgetIds = widgets.map((w) => w.id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={widgetIds} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-12 gap-4 p-2">
          {widgets.map((widget) => (
            <SortableWidget
              key={widget.id}
              widget={widget}
              isEditMode={isEditMode}
              onRemove={
                isEditMode && onRemoveWidget
                  ? () => onRemoveWidget(widget.id)
                  : undefined
              }
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
