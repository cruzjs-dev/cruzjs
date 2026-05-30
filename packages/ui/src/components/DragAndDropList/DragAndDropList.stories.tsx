import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { DragAndDropList } from './DragAndDropList';
import type { DragAndDropListItem } from './DragAndDropList';

const meta = {
  title: 'Data Display/DragAndDropList',
  component: DragAndDropList,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Reorderable list using HTML5 Drag and Drop API with grip handle and drop indicator.',
      },
    },
  },
} satisfies Meta<typeof DragAndDropList>;

export default meta;
type Story = StoryObj<typeof meta>;

const defaultItems: DragAndDropListItem[] = [
  { id: '1', content: 'Design system review' },
  { id: '2', content: 'API endpoint refactor' },
  { id: '3', content: 'Write integration tests' },
  { id: '4', content: 'Deploy to staging' },
  { id: '5', content: 'Performance audit' },
];

export const Default: Story = {
  args: {
    items: defaultItems,
    onReorder: () => {},
  },
  render: () => {
    const [items, setItems] = useState(defaultItems);
    return (
      <div className="max-w-md">
        <DragAndDropList items={items} onReorder={setItems} />
      </div>
    );
  },
};

export const WithCustomRender: Story = {
  args: {
    items: defaultItems,
    onReorder: () => {},
  },
  render: () => {
    const [items, setItems] = useState<DragAndDropListItem[]>([
      { id: 'a', content: 'High priority task' },
      { id: 'b', content: 'Medium priority task' },
      { id: 'c', content: 'Low priority task' },
    ]);
    return (
      <div className="max-w-md">
        <DragAndDropList
          items={items}
          onReorder={setItems}
          renderItem={(item, index, dragHandleProps) => (
            <div className="flex items-center gap-3 px-4 py-3 border border-surface-border rounded-xl bg-surface">
              <span {...dragHandleProps} className="cursor-grab text-text-tertiary">
                &#x2630;
              </span>
              <span className="w-6 h-6 flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                {index + 1}
              </span>
              <span className="text-sm text-text-strong">{item.content}</span>
            </div>
          )}
        />
      </div>
    );
  },
};

export const Disabled: Story = {
  args: {
    items: defaultItems,
    onReorder: () => {},
    disabled: true,
  },
  render: () => (
    <div className="max-w-md">
      <DragAndDropList items={defaultItems} onReorder={() => {}} disabled />
    </div>
  ),
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  args: {
    items: defaultItems,
    onReorder: () => {},
  },
  render: () => {
    const [items, setItems] = useState(defaultItems.slice(0, 4));
    return (
      <div className="p-4">
        <DragAndDropList items={items} onReorder={setItems} />
      </div>
    );
  },
};
