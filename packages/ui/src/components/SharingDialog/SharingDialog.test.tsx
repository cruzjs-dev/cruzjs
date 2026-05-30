import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SharingDialog } from './SharingDialog';
import type { PermissionLevel, SharedUser } from './SharingDialog';

const permissions: PermissionLevel[] = [
  { value: 'view', label: 'Can view' },
  { value: 'edit', label: 'Can edit' },
];

const sharedUsers: SharedUser[] = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com', permission: 'edit' },
  { id: '2', name: 'Bob Smith', email: 'bob@example.com', permission: 'view' },
];

function mockMatchMedia(matches = false) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Mock HTMLDialogElement methods for jsdom
function mockDialogElement() {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
      Object.defineProperty(this, 'open', { value: true, writable: true, configurable: true });
    });
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open');
      Object.defineProperty(this, 'open', { value: false, writable: true, configurable: true });
      this.dispatchEvent(new Event('close'));
    });
  }
}

describe('SharingDialog', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    mockDialogElement();
  });

  it('renders dialog when open', () => {
    render(
      <SharingDialog open onOpenChange={() => {}} permissions={permissions} />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows title', () => {
    render(
      <SharingDialog open onOpenChange={() => {}} permissions={permissions} title="Share Document" />,
    );
    expect(screen.getByText('Share Document')).toBeInTheDocument();
  });

  it('shows default title when none provided', () => {
    render(
      <SharingDialog open onOpenChange={() => {}} permissions={permissions} />,
    );
    expect(screen.getByText('Share')).toBeInTheDocument();
  });

  it('renders share link', () => {
    render(
      <SharingDialog
        open
        onOpenChange={() => {}}
        permissions={permissions}
        shareLink="https://example.com/share/abc123"
      />,
    );
    expect(screen.getByText('https://example.com/share/abc123')).toBeInTheDocument();
    expect(screen.getByText('Copy')).toBeInTheDocument();
  });

  it('renders shared users with names', () => {
    render(
      <SharingDialog
        open
        onOpenChange={() => {}}
        permissions={permissions}
        sharedWith={sharedUsers}
      />,
    );
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
  });

  it('calls onInvite with email and permission', () => {
    const onInvite = vi.fn();
    render(
      <SharingDialog
        open
        onOpenChange={() => {}}
        permissions={permissions}
        defaultPermission="edit"
        onInvite={onInvite}
      />,
    );

    const input = screen.getByPlaceholderText('Enter email address');
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByText('Invite'));

    expect(onInvite).toHaveBeenCalledWith('test@example.com', 'edit');
  });

  it('calls onPermissionChange when permission changed', () => {
    const onPermissionChange = vi.fn();
    render(
      <SharingDialog
        open
        onOpenChange={() => {}}
        permissions={permissions}
        sharedWith={sharedUsers}
        onPermissionChange={onPermissionChange}
      />,
    );

    const aliceSelect = screen.getByLabelText('Permission for Alice Johnson');
    fireEvent.change(aliceSelect, { target: { value: 'view' } });

    expect(onPermissionChange).toHaveBeenCalledWith('1', 'view');
  });

  it('calls onRemove when remove clicked', () => {
    const onRemove = vi.fn();
    render(
      <SharingDialog
        open
        onOpenChange={() => {}}
        permissions={permissions}
        sharedWith={sharedUsers}
        onRemove={onRemove}
      />,
    );

    fireEvent.click(screen.getByLabelText('Remove Alice Johnson'));
    expect(onRemove).toHaveBeenCalledWith('1');
  });

  it('closes on Escape', () => {
    const onOpenChange = vi.fn();
    render(
      <SharingDialog open onOpenChange={onOpenChange} permissions={permissions} />,
    );

    const dialog = screen.getByRole('dialog');
    // Simulate native dialog close event (triggered by Escape key)
    dialog.dispatchEvent(new Event('close'));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('renders invite input and button', () => {
    render(
      <SharingDialog open onOpenChange={() => {}} permissions={permissions} />,
    );

    expect(screen.getByPlaceholderText('Enter email address')).toBeInTheDocument();
    expect(screen.getByText('Invite')).toBeInTheDocument();
  });

  it('clears email input after invite', () => {
    const onInvite = vi.fn();
    render(
      <SharingDialog
        open
        onOpenChange={() => {}}
        permissions={permissions}
        onInvite={onInvite}
      />,
    );

    const input = screen.getByPlaceholderText('Enter email address') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByText('Invite'));

    expect(input.value).toBe('');
  });

  it('does not render share link section when shareLink is not provided', () => {
    render(
      <SharingDialog open onOpenChange={() => {}} permissions={permissions} />,
    );

    expect(screen.queryByText('Copy')).not.toBeInTheDocument();
  });
});
