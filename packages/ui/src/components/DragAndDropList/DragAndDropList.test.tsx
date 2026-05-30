import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DragAndDropList } from './DragAndDropList';
import type { DragAndDropListItem } from './DragAndDropList';

const items: DragAndDropListItem[] = [
  { id: '1', content: 'Item A' },
  { id: '2', content: 'Item B' },
  { id: '3', content: 'Item C' },
];

describe('DragAndDropList', () => {
  it('renders all items', () => {
    const onReorder = vi.fn();
    render(<DragAndDropList items={items} onReorder={onReorder} />);
    expect(screen.getByText('Item A')).toBeInTheDocument();
    expect(screen.getByText('Item B')).toBeInTheDocument();
    expect(screen.getByText('Item C')).toBeInTheDocument();
  });

  it('renders drag handles for each item', () => {
    const onReorder = vi.fn();
    render(<DragAndDropList items={items} onReorder={onReorder} />);
    const handles = screen.getAllByLabelText('Drag handle');
    expect(handles).toHaveLength(3);
  });

  it('calls onReorder when item is dropped on another', () => {
    const onReorder = vi.fn();
    render(<DragAndDropList items={items} onReorder={onReorder} />);

    const firstItem = screen.getByTestId('drag-item-1');
    const secondItem = screen.getByTestId('drag-item-2');

    // Simulate drag from item 1
    const dataTransfer = {
      effectAllowed: '',
      dropEffect: '',
      setData: vi.fn(),
      getData: vi.fn(() => '0'),
    };

    fireEvent.dragStart(screen.getAllByLabelText('Drag handle')[0], { dataTransfer });
    fireEvent.dragOver(secondItem, { dataTransfer });
    fireEvent.drop(secondItem, { dataTransfer });

    expect(onReorder).toHaveBeenCalledTimes(1);
    const reorderedItems = onReorder.mock.calls[0][0];
    expect(reorderedItems[0].id).toBe('2');
    expect(reorderedItems[1].id).toBe('1');
    expect(reorderedItems[2].id).toBe('3');
  });

  it('does not allow drag when disabled', () => {
    const onReorder = vi.fn();
    render(<DragAndDropList items={items} onReorder={onReorder} disabled />);

    const handles = screen.getAllByLabelText('Drag handle');
    expect(handles[0]).toHaveAttribute('draggable', 'false');
  });

  it('applies custom className', () => {
    const onReorder = vi.fn();
    const { container } = render(
      <DragAndDropList items={items} onReorder={onReorder} className="custom-class" />,
    );
    expect(container.querySelector('ul')).toHaveClass('custom-class');
  });

  it('renders with custom renderItem', () => {
    const onReorder = vi.fn();
    render(
      <DragAndDropList
        items={items}
        onReorder={onReorder}
        renderItem={(item, _index, dragHandleProps) => (
          <div>
            <span {...dragHandleProps}>handle</span>
            <span>Custom: {item.id}</span>
          </div>
        )}
      />,
    );
    expect(screen.getByText('Custom: 1')).toBeInTheDocument();
    expect(screen.getByText('Custom: 2')).toBeInTheDocument();
  });

  it('does not call onReorder when dropping on same position', () => {
    const onReorder = vi.fn();
    render(<DragAndDropList items={items} onReorder={onReorder} />);

    const firstItem = screen.getByTestId('drag-item-1');
    const dataTransfer = {
      effectAllowed: '',
      dropEffect: '',
      setData: vi.fn(),
      getData: vi.fn(() => '0'),
    };

    fireEvent.dragStart(screen.getAllByLabelText('Drag handle')[0], { dataTransfer });
    fireEvent.drop(firstItem, { dataTransfer });

    expect(onReorder).not.toHaveBeenCalled();
  });

  it('cleans up drag state on dragEnd', () => {
    const onReorder = vi.fn();
    render(<DragAndDropList items={items} onReorder={onReorder} />);

    const firstItem = screen.getByTestId('drag-item-1');
    const dataTransfer = {
      effectAllowed: '',
      dropEffect: '',
      setData: vi.fn(),
      getData: vi.fn(() => '0'),
    };

    fireEvent.dragStart(screen.getAllByLabelText('Drag handle')[0], { dataTransfer });
    fireEvent.dragEnd(firstItem);

    // After dragEnd, no drop indicator should be visible
    expect(screen.queryByTestId('drop-indicator')).not.toBeInTheDocument();
  });
});
