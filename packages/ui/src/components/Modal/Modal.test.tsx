import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

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

describe('Modal', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it('renders when open', () => {
    render(
      <Modal open onClose={() => {}}>
        Content here
      </Modal>,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Content here')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <Modal open={false} onClose={() => {}}>
        Content
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders title and description', () => {
    render(
      <Modal open onClose={() => {}} title="My Title" description="My description">
        Body
      </Modal>,
    );
    expect(screen.getByText('My Title')).toBeInTheDocument();
    expect(screen.getByText('My description')).toBeInTheDocument();
  });

  it('renders footer', () => {
    render(
      <Modal open onClose={() => {}} footer={<button>Save</button>}>
        Body
      </Modal>,
    );
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose}>
        Body
      </Modal>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose on Escape when closeOnEscape=false', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} closeOnEscape={false}>
        Body
      </Modal>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('has aria-modal attribute', () => {
    render(
      <Modal open onClose={() => {}}>
        Body
      </Modal>,
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('renders close button by default', () => {
    render(
      <Modal open onClose={() => {}}>
        Body
      </Modal>,
    );
    expect(screen.getByLabelText('Close')).toBeInTheDocument();
  });

  it('hides close button when showCloseButton=false', () => {
    render(
      <Modal open onClose={() => {}} showCloseButton={false}>
        Body
      </Modal>,
    );
    expect(screen.queryByLabelText('Close')).not.toBeInTheDocument();
  });

  it('portals to document.body so inert trapping does not block clicks', () => {
    render(
      <div data-testid="host">
        <Modal open onClose={() => {}}>
          <button type="button">Inside modal</button>
        </Modal>
      </div>,
    );
    const host = screen.getByTestId('host');
    expect(host.querySelector('[data-modal-root]')).toBeNull();
    expect(document.body.querySelector('[data-modal-root]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Inside modal' }));
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose}>
        Body
      </Modal>,
    );
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
