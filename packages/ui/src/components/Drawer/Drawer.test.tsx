import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Drawer } from './Drawer';

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

describe('Drawer', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it('renders when open', () => {
    render(
      <Drawer open onClose={() => {}}>Content</Drawer>,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <Drawer open={false} onClose={() => {}}>Content</Drawer>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders title and description', () => {
    render(
      <Drawer open onClose={() => {}} title="Settings" description="Manage your preferences">
        Body
      </Drawer>,
    );
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Manage your preferences')).toBeInTheDocument();
  });

  it('renders footer', () => {
    render(
      <Drawer open onClose={() => {}} footer={<button>Save</button>}>Body</Drawer>,
    );
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('calls onClose on Escape', () => {
    const onClose = vi.fn();
    render(<Drawer open onClose={onClose}>Body</Drawer>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close on Escape when disabled', () => {
    const onClose = vi.fn();
    render(<Drawer open onClose={onClose} closeOnEscape={false}>Body</Drawer>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('has aria-modal', () => {
    render(<Drawer open onClose={() => {}}>Body</Drawer>);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('renders close button by default', () => {
    render(<Drawer open onClose={() => {}}>Body</Drawer>);
    expect(screen.getByLabelText('Close')).toBeInTheDocument();
  });

  it('hides close button when showCloseButton=false', () => {
    render(<Drawer open onClose={() => {}} showCloseButton={false}>Body</Drawer>);
    expect(screen.queryByLabelText('Close')).not.toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<Drawer open onClose={onClose}>Body</Drawer>);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
