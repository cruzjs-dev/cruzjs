import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Modal } from './Modal';

const meta = {
  title: 'Overlay/Modal',
  component: Modal,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Accessible modal dialog with desktop centered overlay and mobile bottom sheet.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl', 'full'] },
    showCloseButton: { control: 'boolean' },
    closeOnBackdrop: { control: 'boolean' },
    closeOnEscape: { control: 'boolean' },
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

function ModalDemo({ size = 'md' as const, title = 'Dialog Title', description = '' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark active:scale-[0.98] transition-all"
      >
        Open Modal
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size={size}
        title={title}
        description={description || undefined}
      >
        <p className="text-sm text-text-secondary leading-relaxed">
          This is the modal body content. It supports any React node — forms, lists, media, or complex layouts.
        </p>
      </Modal>
    </>
  );
}

export const Default: Story = {
  args: {
    open: false,
    onClose: () => {},
    children: 'Content',
  },
  render: () => <ModalDemo />,
};

export const WithDescription: Story = {
  args: { open: false, onClose: () => {}, children: '' },
  render: () => (
    <ModalDemo
      title="Delete Project"
      description="This action cannot be undone. All data will be permanently removed."
    />
  ),
};

export const Sizes: Story = {
  args: { open: false, onClose: () => {}, children: '' },
  render: () => (
    <div className="flex flex-wrap gap-3">
      {(['sm', 'md', 'lg', 'xl'] as const).map((s) => (
        <SizeDemo key={s} size={s} />
      ))}
    </div>
  ),
};

function SizeDemo({ size }: { size: 'sm' | 'md' | 'lg' | 'xl' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl border border-surface-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-lighter active:scale-[0.98] transition-all"
      >
        {size.toUpperCase()}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} size={size} title={`Size: ${size}`}>
        <p className="text-sm text-text-secondary">
          This modal uses the <code className="rounded bg-surface-lighter px-1.5 py-0.5 text-xs font-mono">{size}</code> size preset.
        </p>
      </Modal>
    </>
  );
}

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
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title="Confirm Changes"
          description="You have unsaved changes. Would you like to save before closing?"
          footer={
            <>
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl border border-surface-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-lighter transition-colors"
              >
                Discard
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark transition-colors"
              >
                Save Changes
              </button>
            </>
          }
        >
          <p className="text-sm text-text-secondary">
            Your changes to the project settings have not been saved yet.
          </p>
        </Modal>
      </>
    );
  },
};

export const WithForm: Story = {
  args: { open: false, onClose: () => {}, children: '' },
  render: function WithFormRender() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark active:scale-[0.98] transition-all"
        >
          Create Item
        </button>
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title="Create New Item"
          size="sm"
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
                Create
              </button>
            </>
          }
        >
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Name</label>
              <input
                type="text"
                className="w-full rounded-xl border border-input-border bg-surface px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-shadow"
                placeholder="Enter name..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Description</label>
              <textarea
                rows={3}
                className="w-full rounded-xl border border-input-border bg-surface px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-shadow resize-none"
                placeholder="Optional description..."
              />
            </div>
          </form>
        </Modal>
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
          Open Modal (Mobile)
        </button>
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title="Mobile Dialog"
          description="This renders as a bottom sheet on mobile devices."
          footer={
            <>
              <button
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl border border-surface-border px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-lighter transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark transition-colors"
              >
                Confirm
              </button>
            </>
          }
        >
          <p className="text-sm text-text-secondary leading-relaxed">
            On mobile, the modal slides up from the bottom as a sheet. You can swipe down to dismiss.
          </p>
        </Modal>
      </div>
    );
  },
};
