import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Drawer } from './Drawer';

const meta = {
  title: 'Overlay/Drawer',
  component: Drawer,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Slide-in panel from left or right edge. Full-screen bottom sheet on mobile.',
      },
    },
  },
  argTypes: {
    side: { control: 'select', options: ['left', 'right'] },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl', 'full'] },
    showCloseButton: { control: 'boolean' },
  },
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;

function DrawerDemo({
  side = 'right' as const,
  size = 'md' as const,
  label = 'Open Drawer',
}: { side?: 'left' | 'right'; size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark active:scale-[0.98] transition-all"
      >
        {label}
      </button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        side={side}
        size={size}
        title="Drawer Title"
        description="A panel that slides in from the edge."
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary leading-relaxed">
            This is drawer content. It scrolls independently when content overflows.
          </p>
          <div className="rounded-xl border border-surface-border bg-surface-lighter p-4">
            <p className="text-xs text-text-tertiary">Some nested content block</p>
          </div>
        </div>
      </Drawer>
    </>
  );
}

export const Default: Story = {
  args: { open: false, onClose: () => {}, children: '' },
  render: () => <DrawerDemo />,
};

export const LeftSide: Story = {
  args: { open: false, onClose: () => {}, children: '' },
  render: () => <DrawerDemo side="left" label="Open Left Drawer" />,
};

export const Sizes: Story = {
  args: { open: false, onClose: () => {}, children: '' },
  render: () => (
    <div className="flex flex-wrap gap-3">
      {(['sm', 'md', 'lg', 'xl'] as const).map((s) => (
        <DrawerDemo key={s} size={s} label={s.toUpperCase()} />
      ))}
    </div>
  ),
};

export const WithFooter: Story = {
  args: { open: false, onClose: () => {}, children: '' },
  render: function WithFooterRender() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark active:scale-[0.98] transition-all"
        >
          Open with Footer
        </button>
        <Drawer
          open={open}
          onClose={() => setOpen(false)}
          title="Settings"
          description="Configure your preferences"
          footer={
            <>
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl border border-surface-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-lighter transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark transition-colors"
              >
                Save
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Display Name</label>
              <input
                type="text"
                className="w-full rounded-xl border border-input-border bg-surface px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-shadow"
                defaultValue="Kerry Ritter"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
              <input
                type="email"
                className="w-full rounded-xl border border-input-border bg-surface px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-shadow"
                defaultValue="kerry@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Bio</label>
              <textarea
                rows={4}
                className="w-full rounded-xl border border-input-border bg-surface px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-shadow resize-none"
                defaultValue="Full-stack developer building CruzJS."
              />
            </div>
          </div>
        </Drawer>
      </>
    );
  },
};

export const WithScrollableContent: Story = {
  args: { open: false, onClose: () => {}, children: '' },
  render: function ScrollableRender() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark active:scale-[0.98] transition-all"
        >
          Scrollable Content
        </button>
        <Drawer open={open} onClose={() => setOpen(false)} title="Long Content" size="sm">
          <div className="space-y-4">
            {Array.from({ length: 20 }, (_, i) => (
              <div key={i} className="rounded-xl border border-surface-border bg-surface-lighter p-4">
                <p className="text-sm font-medium text-text-secondary">Item {i + 1}</p>
                <p className="text-xs text-text-tertiary mt-1">Some description text for this item.</p>
              </div>
            ))}
          </div>
        </Drawer>
      </>
    );
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  args: { open: false, onClose: () => {}, children: '' },
  render: function MobileRender() {
    const [open, setOpen] = useState(false);
    return (
      <div className="p-4">
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark active:scale-[0.98] transition-all"
        >
          Open Drawer (Mobile)
        </button>
        <Drawer
          open={open}
          onClose={() => setOpen(false)}
          title="Mobile Drawer"
          description="Renders as a bottom sheet on mobile."
          footer={
            <button
              onClick={() => setOpen(false)}
              className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark transition-colors"
            >
              Done
            </button>
          }
        >
          <p className="text-sm text-text-secondary leading-relaxed">
            On mobile, the drawer slides up from the bottom. Swipe down to dismiss.
          </p>
        </Drawer>
      </div>
    );
  },
};
