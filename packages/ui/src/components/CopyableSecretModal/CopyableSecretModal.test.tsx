import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CopyableSecretModal } from './CopyableSecretModal';

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

describe('CopyableSecretModal', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it('renders when open', () => {
    render(
      <CopyableSecretModal
        open
        onClose={() => {}}
        secret="sk_test_abc123"
      />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not render when not open', () => {
    render(
      <CopyableSecretModal
        open={false}
        onClose={() => {}}
        secret="sk_test_abc123"
      />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the secret value', () => {
    render(
      <CopyableSecretModal
        open
        onClose={() => {}}
        secret="sk_test_abc123"
      />,
    );
    expect(screen.getByTestId('secret-value')).toHaveTextContent('sk_test_abc123');
  });

  it('renders default title and description', () => {
    render(
      <CopyableSecretModal
        open
        onClose={() => {}}
        secret="sk_test_abc123"
      />,
    );
    expect(screen.getByText('Secret Created')).toBeInTheDocument();
    expect(screen.getByText("Copy this secret now. It won't be shown again.")).toBeInTheDocument();
  });

  it('renders custom title and description', () => {
    render(
      <CopyableSecretModal
        open
        onClose={() => {}}
        secret="sk_test_abc123"
        title="API Key Ready"
        description="Store this key securely."
      />,
    );
    expect(screen.getByText('API Key Ready')).toBeInTheDocument();
    expect(screen.getByText('Store this key securely.')).toBeInTheDocument();
  });

  it('renders metadata key-value pairs', () => {
    render(
      <CopyableSecretModal
        open
        onClose={() => {}}
        secret="sk_test_abc123"
        metadata={[
          { label: 'Name', value: 'My Key' },
          { label: 'Prefix', value: 'sk_test_...' },
        ]}
      />,
    );
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('My Key')).toBeInTheDocument();
    expect(screen.getByText('Prefix')).toBeInTheDocument();
    expect(screen.getByText('sk_test_...')).toBeInTheDocument();
  });

  it('renders the label above the secret', () => {
    render(
      <CopyableSecretModal
        open
        onClose={() => {}}
        secret="sk_test_abc123"
        label="API Key"
      />,
    );
    expect(screen.getByText('API Key')).toBeInTheDocument();
  });

  it('shows warning alert', () => {
    render(
      <CopyableSecretModal
        open
        onClose={() => {}}
        secret="sk_test_abc123"
      />,
    );
    expect(
      screen.getByText('This secret will only be shown once. Make sure to copy it.'),
    ).toBeInTheDocument();
  });

  describe('copy button', () => {
    it('shows "Copy" initially and transitions to "Copied!" on click', async () => {
      const user = userEvent.setup();
      render(
        <CopyableSecretModal
          open
          onClose={() => {}}
          secret="sk_test_abc123"
        />,
      );
      expect(screen.getByText('Copy')).toBeInTheDocument();

      await user.click(screen.getByLabelText('Copy secret'));

      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
    });

    it('updates aria-label to "Copied" after click', async () => {
      const user = userEvent.setup();
      render(
        <CopyableSecretModal
          open
          onClose={() => {}}
          secret="sk_test_abc123"
        />,
      );
      await user.click(screen.getByLabelText('Copy secret'));

      await waitFor(() => {
        expect(screen.getByLabelText('Copied')).toBeInTheDocument();
      });
    });
  });

  describe('requireCopy (default: true)', () => {
    it('disables the Done button until user copies', () => {
      render(
        <CopyableSecretModal
          open
          onClose={() => {}}
          secret="sk_test_abc123"
        />,
      );
      const doneButton = screen.getByText('Done');
      expect(doneButton).toBeDisabled();
    });

    it('shows hint text before copy', () => {
      render(
        <CopyableSecretModal
          open
          onClose={() => {}}
          secret="sk_test_abc123"
        />,
      );
      expect(screen.getByTestId('copy-hint')).toHaveTextContent(
        'You must copy the secret before closing',
      );
    });

    it('does not call onClose when Done is clicked before copy', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(
        <CopyableSecretModal
          open
          onClose={onClose}
          secret="sk_test_abc123"
        />,
      );
      await user.click(screen.getByText('Done'));
      expect(onClose).not.toHaveBeenCalled();
    });

    it('enables Done button and calls onClose after copy', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(
        <CopyableSecretModal
          open
          onClose={onClose}
          secret="sk_test_abc123"
        />,
      );

      // Copy first
      await user.click(screen.getByLabelText('Copy secret'));
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });

      // Done button should now be enabled
      const doneButton = screen.getByText('Done');
      expect(doneButton).not.toBeDisabled();

      await user.click(doneButton);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('hides hint text after copy', async () => {
      const user = userEvent.setup();
      render(
        <CopyableSecretModal
          open
          onClose={() => {}}
          secret="sk_test_abc123"
        />,
      );

      await user.click(screen.getByLabelText('Copy secret'));
      await waitFor(() => {
        expect(screen.queryByTestId('copy-hint')).not.toBeInTheDocument();
      });
    });

    it('does not close on Escape before copy', () => {
      const onClose = vi.fn();
      render(
        <CopyableSecretModal
          open
          onClose={onClose}
          secret="sk_test_abc123"
        />,
      );
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('requireCopy=false', () => {
    it('enables Done button immediately', () => {
      render(
        <CopyableSecretModal
          open
          onClose={() => {}}
          secret="sk_test_abc123"
          requireCopy={false}
        />,
      );
      const doneButton = screen.getByText('Done');
      expect(doneButton).not.toBeDisabled();
    });

    it('does not show hint text', () => {
      render(
        <CopyableSecretModal
          open
          onClose={() => {}}
          secret="sk_test_abc123"
          requireCopy={false}
        />,
      );
      expect(screen.queryByTestId('copy-hint')).not.toBeInTheDocument();
    });

    it('calls onClose immediately when Done is clicked', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(
        <CopyableSecretModal
          open
          onClose={onClose}
          secret="sk_test_abc123"
          requireCopy={false}
        />,
      );
      await user.click(screen.getByText('Done'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('forwards ref', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(
      <CopyableSecretModal
        ref={ref}
        open
        onClose={() => {}}
        secret="sk_test_abc123"
      />,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('merges custom className', () => {
    render(
      <CopyableSecretModal
        open
        onClose={() => {}}
        secret="sk_test_abc123"
        className="custom-modal-class"
      />,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('custom-modal-class');
  });
});
