import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { SharingDialog } from './SharingDialog';
import type { SharedUser } from './SharingDialog';

const permissions = [
  { value: 'view', label: 'Can view' },
  { value: 'edit', label: 'Can edit' },
  { value: 'admin', label: 'Admin' },
];

const defaultUsers: SharedUser[] = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com', permission: 'edit' },
  { id: '2', name: 'Bob Smith', email: 'bob@example.com', avatarSrc: 'https://i.pravatar.cc/80?u=bob', permission: 'view' },
];

const manyUsers: SharedUser[] = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com', permission: 'edit' },
  { id: '2', name: 'Bob Smith', email: 'bob@example.com', permission: 'view' },
  { id: '3', name: 'Carol White', email: 'carol@example.com', permission: 'admin' },
  { id: '4', name: 'David Brown', email: 'david@example.com', permission: 'view' },
  { id: '5', name: 'Eve Davis', email: 'eve@example.com', permission: 'edit' },
  { id: '6', name: 'Frank Miller', email: 'frank@example.com', permission: 'view' },
  { id: '7', name: 'Grace Wilson', email: 'grace@example.com', permission: 'edit' },
  { id: '8', name: 'Henry Moore', email: 'henry@example.com', permission: 'view' },
  { id: '9', name: 'Ivy Taylor', email: 'ivy@example.com', permission: 'admin' },
];

const meta = {
  title: 'Overlays/SharingDialog',
  component: SharingDialog,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Share/invite dialog with email invite input, shareable link copy, and permission level selector per invitee.',
      },
    },
  },
} satisfies Meta<typeof SharingDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: false,
    onOpenChange: () => {},
    permissions,
  },
  render: function DefaultRender() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark active:scale-[0.98] transition-all"
        >
          Share
        </button>
        <SharingDialog
          open={open}
          onOpenChange={setOpen}
          permissions={permissions}
          shareLink="https://app.example.com/d/abc123"
          sharedWith={defaultUsers}
          defaultPermission="view"
          onInvite={(email, perm) => console.log('Invite:', email, perm)}
          onPermissionChange={(id, perm) => console.log('Permission change:', id, perm)}
          onRemove={(id) => console.log('Remove:', id)}
        />
      </>
    );
  },
};

export const Empty: Story = {
  args: {
    open: false,
    onOpenChange: () => {},
    permissions,
  },
  render: function EmptyRender() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark active:scale-[0.98] transition-all"
        >
          Share (Empty)
        </button>
        <SharingDialog
          open={open}
          onOpenChange={setOpen}
          permissions={permissions}
          shareLink="https://app.example.com/d/abc123"
          sharedWith={[]}
          defaultPermission="view"
        />
      </>
    );
  },
};

export const WithInvite: Story = {
  args: {
    open: false,
    onOpenChange: () => {},
    permissions,
  },
  render: function WithInviteRender() {
    const [open, setOpen] = useState(false);
    const [users, setUsers] = useState<SharedUser[]>(defaultUsers);

    const handleInvite = (email: string, permission: string) => {
      setUsers((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          name: email.split('@')[0],
          email,
          permission,
        },
      ]);
    };

    const handlePermissionChange = (userId: string, permission: string) => {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, permission } : u)),
      );
    };

    const handleRemove = (userId: string) => {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    };

    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark active:scale-[0.98] transition-all"
        >
          Share (Interactive)
        </button>
        <SharingDialog
          open={open}
          onOpenChange={setOpen}
          permissions={permissions}
          shareLink="https://app.example.com/d/abc123"
          sharedWith={users}
          defaultPermission="view"
          onInvite={handleInvite}
          onPermissionChange={handlePermissionChange}
          onRemove={handleRemove}
        />
      </>
    );
  },
};

export const ManyUsers: Story = {
  args: {
    open: false,
    onOpenChange: () => {},
    permissions,
  },
  render: function ManyUsersRender() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark active:scale-[0.98] transition-all"
        >
          Share (Many Users)
        </button>
        <SharingDialog
          open={open}
          onOpenChange={setOpen}
          permissions={permissions}
          shareLink="https://app.example.com/d/abc123"
          sharedWith={manyUsers}
          defaultPermission="view"
          onInvite={(email, perm) => console.log('Invite:', email, perm)}
          onPermissionChange={(id, perm) => console.log('Permission change:', id, perm)}
          onRemove={(id) => console.log('Remove:', id)}
        />
      </>
    );
  },
};

export const NoLink: Story = {
  args: {
    open: false,
    onOpenChange: () => {},
    permissions,
  },
  render: function NoLinkRender() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark active:scale-[0.98] transition-all"
        >
          Share (No Link)
        </button>
        <SharingDialog
          open={open}
          onOpenChange={setOpen}
          permissions={permissions}
          sharedWith={defaultUsers}
          defaultPermission="view"
          onInvite={(email, perm) => console.log('Invite:', email, perm)}
          onPermissionChange={(id, perm) => console.log('Permission change:', id, perm)}
          onRemove={(id) => console.log('Remove:', id)}
        />
      </>
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
    onOpenChange: () => {},
    permissions,
  },
  render: function MobileRender() {
    const [open, setOpen] = useState(false);
    return (
      <div className="p-4">
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark active:scale-[0.98] transition-all"
        >
          Share (Mobile)
        </button>
        <SharingDialog
          open={open}
          onOpenChange={setOpen}
          permissions={permissions}
          shareLink="https://app.example.com/d/abc123"
          sharedWith={defaultUsers}
          defaultPermission="view"
          onInvite={(email, perm) => console.log('Invite:', email, perm)}
          onPermissionChange={(id, perm) => console.log('Permission change:', id, perm)}
          onRemove={(id) => console.log('Remove:', id)}
        />
      </div>
    );
  },
};
