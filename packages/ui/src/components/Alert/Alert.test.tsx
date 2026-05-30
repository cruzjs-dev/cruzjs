import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Alert } from './Alert';
import type { AlertVariant } from './Alert';

// ─── Role Mapping ────────────────────────────────────────────────────────────

describe('Alert -- role attribute', () => {
  it('renders role="status" for info variant', () => {
    render(<Alert variant="info">Info message</Alert>);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders role="status" for success variant', () => {
    render(<Alert variant="success">Success message</Alert>);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders role="alert" for warning variant', () => {
    render(<Alert variant="warning">Warning message</Alert>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders role="alert" for error variant', () => {
    render(<Alert variant="error">Error message</Alert>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

// ─── Variant Rendering ──────────────────────────────────────────────────────

describe('Alert -- variants', () => {
  it.each<AlertVariant>(['info', 'success', 'warning', 'error'])(
    'renders %s variant without crashing',
    (variant) => {
      const { container } = render(<Alert variant={variant}>Test</Alert>);
      expect(container.firstChild).toBeInTheDocument();
    },
  );
});

// ─── Title and Description ──────────────────────────────────────────────────

describe('Alert -- title and description', () => {
  it('renders title text', () => {
    render(<Alert title="Alert Title">Description text</Alert>);
    expect(screen.getByText('Alert Title')).toBeInTheDocument();
  });

  it('renders description (children) text', () => {
    render(<Alert>Description text</Alert>);
    expect(screen.getByText('Description text')).toBeInTheDocument();
  });

  it('renders both title and description together', () => {
    render(<Alert title="Heading">Body content</Alert>);
    expect(screen.getByText('Heading')).toBeInTheDocument();
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });
});

// ─── Dismiss Button ─────────────────────────────────────────────────────────

describe('Alert -- dismiss button', () => {
  it('fires onDismiss when close button is clicked', async () => {
    const user = userEvent.setup();
    const handleDismiss = vi.fn();
    render(
      <Alert dismissible onDismiss={handleDismiss}>
        Closeable
      </Alert>,
    );
    const closeBtn = screen.getByRole('button', { name: 'Dismiss alert' });
    await user.click(closeBtn);
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('close button has accessible label', () => {
    render(<Alert dismissible>Closeable</Alert>);
    const closeBtn = screen.getByRole('button', { name: 'Dismiss alert' });
    expect(closeBtn).toHaveAttribute('aria-label', 'Dismiss alert');
  });

  it('does not render close button when dismissible is false', () => {
    render(<Alert>Not closeable</Alert>);
    expect(screen.queryByRole('button', { name: 'Dismiss alert' })).not.toBeInTheDocument();
  });

  it('does not render close button when dismissible is not set', () => {
    render(<Alert>Default</Alert>);
    expect(screen.queryByRole('button', { name: 'Dismiss alert' })).not.toBeInTheDocument();
  });
});

// ─── Custom Icon ────────────────────────────────────────────────────────────

describe('Alert -- icons', () => {
  it('renders custom icon when provided', () => {
    render(
      <Alert icon={<span data-testid="custom-icon">*</span>}>
        With custom icon
      </Alert>,
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('renders default icon per variant (svg is present)', () => {
    const { container } = render(<Alert variant="error">Error</Alert>);
    const svgs = container.querySelectorAll('svg');
    // At least one SVG for the default icon
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });

  it.each<AlertVariant>(['info', 'success', 'warning', 'error'])(
    'renders a default icon for %s variant',
    (variant) => {
      const { container } = render(<Alert variant={variant}>Test</Alert>);
      const svgs = container.querySelectorAll('svg[aria-hidden="true"]');
      expect(svgs.length).toBeGreaterThanOrEqual(1);
    },
  );
});

// ─── Keyboard Interaction ───────────────────────────────────────────────────

describe('Alert -- keyboard', () => {
  it('Escape key fires onDismiss when dismissible and focused inside', async () => {
    const user = userEvent.setup();
    const handleDismiss = vi.fn();
    render(
      <Alert dismissible onDismiss={handleDismiss}>
        Press escape
      </Alert>,
    );
    const closeBtn = screen.getByRole('button', { name: 'Dismiss alert' });
    closeBtn.focus();
    await user.keyboard('{Escape}');
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });
});

// ─── Ref Forwarding ─────────────────────────────────────────────────────────

describe('Alert -- ref forwarding', () => {
  it('forwards ref to the root element', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<Alert ref={ref}>With ref</Alert>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current?.getAttribute('role')).toBe('status');
  });
});

// ─── Extra Props ────────────────────────────────────────────────────────────

describe('Alert -- HTML attributes', () => {
  it('passes through additional HTML attributes', () => {
    render(<Alert data-testid="my-alert" id="alert-1">Content</Alert>);
    const el = screen.getByTestId('my-alert');
    expect(el).toHaveAttribute('id', 'alert-1');
  });

  it('merges custom className', () => {
    const { container } = render(<Alert className="custom-class">Content</Alert>);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
