import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CopyButton } from './CopyButton';

// --- Basic Rendering ---

describe('CopyButton -- renders with label', () => {
  it('renders with default label', () => {
    render(<CopyButton value="test" />);
    expect(screen.getByText('Copy')).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    render(<CopyButton value="test" label="Copy URL" />);
    expect(screen.getByText('Copy URL')).toBeInTheDocument();
  });

  it('renders as a button element', () => {
    render(<CopyButton value="test" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});

// --- Copies to Clipboard ---

describe('CopyButton -- copies to clipboard on click', () => {
  it('transitions to copied state on click, proving clipboard was called', async () => {
    const user = userEvent.setup();
    render(<CopyButton value="hello world" />);
    await user.click(screen.getByRole('button'));
    // The component only transitions to "Copied!" if navigator.clipboard.writeText resolves
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('invokes the onClick callback after copy', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(<CopyButton value="test" onClick={handleClick} />);
    await user.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });
});

// --- Shows Copied State ---

describe('CopyButton -- shows copied state', () => {
  it('shows copied label after click', async () => {
    const user = userEvent.setup();
    render(<CopyButton value="test" />);
    await user.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('shows custom copied label after click', async () => {
    const user = userEvent.setup();
    render(<CopyButton value="test" copiedLabel="Done!" />);
    await user.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByText('Done!')).toBeInTheDocument();
    });
  });

  it('updates aria-label to Copied after click', async () => {
    const user = userEvent.setup();
    render(<CopyButton value="test" />);
    await user.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Copied');
    });
  });
});

// --- Reverts After Timeout ---

describe('CopyButton -- reverts after timeout', () => {
  it('reverts to original label after timeout', async () => {
    vi.useFakeTimers();
    render(<CopyButton value="test" timeout={1000} />);

    // Use fireEvent + manual promise flush to avoid userEvent/fakeTimer conflicts
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(screen.getByText('Copied!')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText('Copy')).toBeInTheDocument();
    vi.useRealTimers();
  });
});

// --- Disabled ---

describe('CopyButton -- disabled', () => {
  it('renders as disabled', () => {
    render(<CopyButton value="test" disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('does not transition to copied state when disabled', () => {
    render(<CopyButton value="test" disabled />);
    fireEvent.click(screen.getByRole('button'));
    // Should still show "Copy", not "Copied!"
    expect(screen.getByText('Copy')).toBeInTheDocument();
    expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
  });

  it('applies opacity class when disabled', () => {
    const { container } = render(<CopyButton value="test" disabled />);
    expect(container.firstChild).toHaveClass('opacity-50');
  });
});

// --- Custom Labels ---

describe('CopyButton -- custom labels', () => {
  it('renders custom label', () => {
    render(<CopyButton value="test" label="Copy Link" />);
    expect(screen.getByText('Copy Link')).toBeInTheDocument();
  });

  it('has correct aria-label from label prop', () => {
    render(<CopyButton value="test" label="Copy Code" />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Copy Code');
  });
});

// --- Ref Forwarding ---

describe('CopyButton -- ref forwarding', () => {
  it('forwards ref to the button element', () => {
    const ref = { current: null as HTMLButtonElement | null };
    render(<CopyButton ref={ref} value="test" />);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});

// --- className Merging ---

describe('CopyButton -- className merging', () => {
  it('merges custom className', () => {
    const { container } = render(<CopyButton value="test" className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
