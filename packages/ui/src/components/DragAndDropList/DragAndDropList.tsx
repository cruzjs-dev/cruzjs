import React, { forwardRef, useCallback, useRef, useState } from 'react';

export type DragAndDropListItem = {
  id: string;
  content: React.ReactNode;
};

export type DragAndDropListProps = {
  items: DragAndDropListItem[];
  onReorder: (items: DragAndDropListItem[]) => void;
  renderItem?: (
    item: DragAndDropListItem,
    index: number,
    dragHandleProps: React.HTMLAttributes<HTMLElement>,
  ) => React.ReactNode;
  disabled?: boolean;
  className?: string;
};

const GripDotsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="currentColor"
    aria-hidden="true"
  >
    <circle cx="5" cy="3" r="1.5" />
    <circle cx="11" cy="3" r="1.5" />
    <circle cx="5" cy="8" r="1.5" />
    <circle cx="11" cy="8" r="1.5" />
    <circle cx="5" cy="13" r="1.5" />
    <circle cx="11" cy="13" r="1.5" />
  </svg>
);

export const DragAndDropList = forwardRef<HTMLUListElement, DragAndDropListProps>(
  function DragAndDropList({ items, onReorder, renderItem, disabled = false, className }, ref) {
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
    const draggedItemRef = useRef<number | null>(null);

    const handleDragStart = useCallback(
      (e: React.DragEvent, index: number) => {
        if (disabled) {
          e.preventDefault();
          return;
        }
        draggedItemRef.current = index;
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
      },
      [disabled],
    );

    const handleDragOver = useCallback(
      (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (disabled) {
          return;
        }
        e.dataTransfer.dropEffect = 'move';
        setDropTargetIndex(index);
      },
      [disabled],
    );

    const handleDragLeave = useCallback(() => {
      setDropTargetIndex(null);
    }, []);

    const handleDrop = useCallback(
      (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        if (disabled) {
          return;
        }

        const sourceIndex = draggedItemRef.current;
        if (sourceIndex === null || sourceIndex === targetIndex) {
          setDraggedIndex(null);
          setDropTargetIndex(null);
          draggedItemRef.current = null;
          return;
        }

        const newItems = [...items];
        const [movedItem] = newItems.splice(sourceIndex, 1);
        newItems.splice(targetIndex, 0, movedItem);

        setDraggedIndex(null);
        setDropTargetIndex(null);
        draggedItemRef.current = null;
        onReorder(newItems);
      },
      [disabled, items, onReorder],
    );

    const handleDragEnd = useCallback(() => {
      setDraggedIndex(null);
      setDropTargetIndex(null);
      draggedItemRef.current = null;
    }, []);

    const getDragHandleProps = useCallback(
      (index: number): React.HTMLAttributes<HTMLElement> => ({
        draggable: !disabled,
        onDragStart: (e: React.DragEvent<HTMLElement>) => handleDragStart(e, index),
        'aria-label': 'Drag handle',
        role: 'button',
        tabIndex: disabled ? -1 : 0,
        style: { cursor: disabled ? 'default' : 'grab' },
      }),
      [disabled, handleDragStart],
    );

    return (
      <ul
        ref={ref}
        role="list"
        className={['space-y-0', className].filter(Boolean).join(' ')}
        aria-disabled={disabled || undefined}
      >
        {items.map((item, index) => {
          const isBeingDragged = draggedIndex === index;
          const isDropTarget = dropTargetIndex === index;

          return (
            <li
              key={item.id}
              data-testid={`drag-item-${item.id}`}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={[
                'relative transition-opacity duration-150',
                isBeingDragged ? 'opacity-50' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {isDropTarget && draggedIndex !== null && draggedIndex !== index && (
                <div
                  data-testid="drop-indicator"
                  className="absolute -top-px left-0 right-0 h-0.5"
                  style={{ backgroundColor: 'var(--color-primary, #3b82f6)' }}
                />
              )}
              {renderItem ? (
                renderItem(item, index, getDragHandleProps(index))
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface px-4 py-3">
                  <span
                    {...getDragHandleProps(index)}
                    className={[
                      'shrink-0 text-text-tertiary transition-colors duration-150',
                      disabled ? 'opacity-50' : 'hover:text-text-secondary',
                    ].join(' ')}
                  >
                    <GripDotsIcon />
                  </span>
                  <div className="flex-1 min-w-0 text-sm text-text-strong">{item.content}</div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  },
);

DragAndDropList.displayName = 'DragAndDropList';
