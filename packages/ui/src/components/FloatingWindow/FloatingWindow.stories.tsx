import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { FloatingWindow } from './FloatingWindow';

const meta = {
  title: 'Overlay/FloatingWindow',
  component: FloatingWindow,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Draggable, resizable floating window panel. Title bar acts as the drag handle. Supports viewport-clamped dragging and constrained resizing.',
      },
    },
  },
  argTypes: {
    resizable: { control: 'boolean' },
    minWidth: { control: 'number' },
    minHeight: { control: 'number' },
  },
} satisfies Meta<typeof FloatingWindow>;

export default meta;
type Story = StoryObj<typeof meta>;

function FloatingWindowDemo({
  title = 'Panel',
  resizable = true,
  defaultSize,
}: {
  title?: string;
  resizable?: boolean;
  defaultSize?: { width: number; height: number };
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="p-8">
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark active:scale-[0.98] transition-all"
      >
        Open {title}
      </button>
      <FloatingWindow
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        resizable={resizable}
        defaultPosition={{ x: 120, y: 80 }}
        defaultSize={defaultSize}
      >
        <p className="text-sm text-text-secondary leading-relaxed">
          Drag the title bar to move. {resizable ? 'Resize from the bottom-right corner.' : ''}
        </p>
      </FloatingWindow>
    </div>
  );
}

export const Default: Story = {
  args: {
    open: false,
    children: 'Content',
  },
  render: () => <FloatingWindowDemo />,
};

export const WithContent: Story = {
  args: {
    open: false,
    children: 'Content',
  },
  render: function WithContentRender() {
    const [open, setOpen] = useState(true);
    return (
      <div className="p-8 min-h-screen bg-surface-sunken">
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark active:scale-[0.98] transition-all"
        >
          Open Window
        </button>
        <FloatingWindow
          open={open}
          onClose={() => setOpen(false)}
          title="Task Details"
          defaultPosition={{ x: 150, y: 60 }}
          defaultSize={{ width: 450, height: 350 }}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-text-tertiary mb-1">Status</label>
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
                In Progress
              </span>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-tertiary mb-1">
                Description
              </label>
              <p className="text-sm text-text-secondary leading-relaxed">
                Implement the floating window component with drag and resize support. Ensure
                viewport bounds are respected and minimum dimensions are enforced during resize
                operations.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-tertiary mb-1">Assignee</label>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                  KR
                </div>
                <span className="text-sm text-text-secondary">Kerry Ritter</span>
              </div>
            </div>
          </div>
        </FloatingWindow>
      </div>
    );
  },
};

export const NonResizable: Story = {
  args: {
    open: false,
    children: 'Content',
  },
  render: () => <FloatingWindowDemo title="Fixed Panel" resizable={false} />,
};

export const CustomSize: Story = {
  args: {
    open: false,
    children: 'Content',
  },
  render: function CustomSizeRender() {
    const [open, setOpen] = useState(true);
    return (
      <div className="p-8 min-h-screen">
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark active:scale-[0.98] transition-all"
        >
          Open Large Window
        </button>
        <FloatingWindow
          open={open}
          onClose={() => setOpen(false)}
          title="Wide Panel"
          defaultPosition={{ x: 60, y: 40 }}
          defaultSize={{ width: 640, height: 480 }}
          minWidth={300}
          minHeight={200}
        >
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              This window starts at 640x480 with a minimum size of 300x200.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-surface-lighter border border-surface-border p-3"
                >
                  <div className="text-xs font-medium text-text-tertiary mb-1">Card {i + 1}</div>
                  <div className="text-lg font-semibold text-text-strong">{(i + 1) * 42}</div>
                </div>
              ))}
            </div>
          </div>
        </FloatingWindow>
      </div>
    );
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  args: {
    open: false,
    children: 'Content',
  },
  render: function MobileRender() {
    const [open, setOpen] = useState(true);
    return (
      <div className="p-4 min-h-screen">
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark active:scale-[0.98] transition-all"
        >
          Open Window (Mobile)
        </button>
        <FloatingWindow
          open={open}
          onClose={() => setOpen(false)}
          title="Mobile Panel"
          defaultPosition={{ x: 16, y: 80 }}
          defaultSize={{ width: 320, height: 260 }}
          minWidth={200}
          minHeight={150}
        >
          <p className="text-sm text-text-secondary leading-relaxed">
            On smaller viewports, the floating window remains draggable and resizable within screen
            bounds.
          </p>
        </FloatingWindow>
      </div>
    );
  },
};
