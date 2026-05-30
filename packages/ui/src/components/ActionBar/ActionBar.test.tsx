import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActionBar } from './ActionBar';

// --- Basic Rendering ---------------------------------------------------------

describe('ActionBar -- visibility', () => {
  it('renders when count > 0', () => {
    render(
      <ActionBar count={3}>
        <button type="button">Edit</button>
      </ActionBar>,
    );
    const toolbar = screen.getByRole('toolbar');
    expect(toolbar).toHaveAttribute('aria-hidden', 'false');
    expect(toolbar).not.toHaveClass('pointer-events-none');
  });

  it('hidden when count is 0', () => {
    render(
      <ActionBar count={0}>
        <button type="button">Edit</button>
      </ActionBar>,
    );
    const toolbar = screen.getByRole('toolbar', { hidden: true });
    expect(toolbar).toHaveAttribute('aria-hidden', 'true');
    expect(toolbar).toHaveClass('pointer-events-none');
  });
});

// --- Count Text --------------------------------------------------------------

describe('ActionBar -- count text', () => {
  it('shows correct count text', () => {
    render(
      <ActionBar count={5}>
        <button type="button">Edit</button>
      </ActionBar>,
    );
    expect(screen.getByText('5 selected')).toBeInTheDocument();
  });

  it('shows singular count text', () => {
    render(
      <ActionBar count={1}>
        <button type="button">Edit</button>
      </ActionBar>,
    );
    expect(screen.getByText('1 selected')).toBeInTheDocument();
  });

  it('supports custom countLabel', () => {
    render(
      <ActionBar count={3} countLabel={(n) => `${n} items selected`}>
        <button type="button">Edit</button>
      </ActionBar>,
    );
    expect(screen.getByText('3 items selected')).toBeInTheDocument();
  });
});

// --- Children ----------------------------------------------------------------

describe('ActionBar -- children', () => {
  it('renders children (action buttons)', () => {
    render(
      <ActionBar count={2}>
        <button type="button">Edit</button>
        <button type="button">Delete</button>
      </ActionBar>,
    );
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });
});

// --- Close Button ------------------------------------------------------------

describe('ActionBar -- close button', () => {
  it('calls onClose when close button clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(
      <ActionBar count={3} onClose={handleClose}>
        <button type="button">Edit</button>
      </ActionBar>,
    );
    const closeButton = screen.getByLabelText('Deselect all');
    await user.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not render close button when onClose is not provided', () => {
    render(
      <ActionBar count={3}>
        <button type="button">Edit</button>
      </ActionBar>,
    );
    expect(screen.queryByLabelText('Deselect all')).not.toBeInTheDocument();
  });
});

// --- ARIA Attributes ---------------------------------------------------------

describe('ActionBar -- aria attributes', () => {
  it('has correct aria attributes', () => {
    render(
      <ActionBar count={4}>
        <button type="button">Archive</button>
      </ActionBar>,
    );
    const toolbar = screen.getByRole('toolbar');
    expect(toolbar).toHaveAttribute('aria-label', '4 selected');
    expect(toolbar).toHaveAttribute('aria-hidden', 'false');
  });

  it('uses custom countLabel for aria-label', () => {
    render(
      <ActionBar count={2} countLabel={(n) => `${n} rows checked`}>
        <button type="button">Move</button>
      </ActionBar>,
    );
    const toolbar = screen.getByRole('toolbar');
    expect(toolbar).toHaveAttribute('aria-label', '2 rows checked');
  });

  it('sets aria-hidden true when not visible', () => {
    render(
      <ActionBar count={0}>
        <button type="button">Edit</button>
      </ActionBar>,
    );
    const toolbar = screen.getByRole('toolbar', { hidden: true });
    expect(toolbar).toHaveAttribute('aria-hidden', 'true');
  });
});

// --- Controlled open prop ----------------------------------------------------

describe('ActionBar -- controlled open', () => {
  it('can be forced open with open=true even when count is 0', () => {
    render(
      <ActionBar count={0} open={true}>
        <button type="button">Edit</button>
      </ActionBar>,
    );
    const toolbar = screen.getByRole('toolbar');
    expect(toolbar).toHaveAttribute('aria-hidden', 'false');
    expect(toolbar).not.toHaveClass('pointer-events-none');
  });

  it('can be forced closed with open=false even when count > 0', () => {
    render(
      <ActionBar count={5} open={false}>
        <button type="button">Edit</button>
      </ActionBar>,
    );
    const toolbar = screen.getByRole('toolbar', { hidden: true });
    expect(toolbar).toHaveAttribute('aria-hidden', 'true');
    expect(toolbar).toHaveClass('pointer-events-none');
  });
});

// --- Ref Forwarding ----------------------------------------------------------

describe('ActionBar -- ref forwarding', () => {
  it('forwards ref to the root div element', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(
      <ActionBar ref={ref} count={1}>
        <button type="button">Edit</button>
      </ActionBar>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
