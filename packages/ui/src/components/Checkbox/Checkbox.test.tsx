import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from './Checkbox';

// ─── Basic Rendering ────────────────────────────────────────────────────────

describe('Checkbox -- renders', () => {
  it('renders a checkbox input', () => {
    render(<Checkbox />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('renders with default props without crashing', () => {
    const { container } = render(<Checkbox />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

// ─── Label ──────────────────────────────────────────────────────────────────

describe('Checkbox -- label', () => {
  it('renders label text', () => {
    render(<Checkbox label="Accept terms" />);
    expect(screen.getByText('Accept terms')).toBeInTheDocument();
  });

  it('associates label with input via htmlFor', () => {
    render(<Checkbox label="Accept terms" />);
    const checkbox = screen.getByRole('checkbox');
    const label = screen.getByText('Accept terms').closest('label');
    expect(label).toHaveAttribute('for', checkbox.id);
  });

  it('renders ReactNode label', () => {
    render(<Checkbox label={<strong>Bold label</strong>} />);
    expect(screen.getByText('Bold label')).toBeInTheDocument();
  });
});

// ─── Description ────────────────────────────────────────────────────────────

describe('Checkbox -- description', () => {
  it('renders description text', () => {
    render(<Checkbox label="Terms" description="You must agree to continue" />);
    expect(screen.getByText('You must agree to continue')).toBeInTheDocument();
  });

  it('links description to input via aria-describedby', () => {
    render(<Checkbox label="Terms" description="Required field" />);
    const checkbox = screen.getByRole('checkbox');
    const describedBy = checkbox.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const descEl = document.getElementById(describedBy!.split(' ')[0]);
    expect(descEl).toHaveTextContent('Required field');
  });
});

// ─── Error ──────────────────────────────────────────────────────────────────

describe('Checkbox -- error', () => {
  it('renders error message', () => {
    render(<Checkbox label="Terms" error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('sets aria-invalid when error is provided', () => {
    render(<Checkbox label="Terms" error="Required" />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('renders error with role=alert', () => {
    render(<Checkbox error="Required" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });
});

// ─── Checked / onChange ─────────────────────────────────────────────────────

describe('Checkbox -- checked / onChange', () => {
  it('fires onChange when clicked', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Checkbox label="Toggle" onChange={handleChange} />);
    await user.click(screen.getByRole('checkbox'));
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('reflects controlled checked state', () => {
    const { rerender } = render(<Checkbox checked={false} onChange={() => {}} />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();

    rerender(<Checkbox checked={true} onChange={() => {}} />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('handles uncontrolled default checked', () => {
    render(<Checkbox defaultChecked={true} />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });
});

// ─── Disabled ───────────────────────────────────────────────────────────────

describe('Checkbox -- disabled', () => {
  it('sets disabled attribute on input', () => {
    render(<Checkbox label="Disabled" disabled />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });

  it('does not fire onChange when disabled', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Checkbox label="Disabled" disabled onChange={handleChange} />);
    await user.click(screen.getByRole('checkbox'));
    expect(handleChange).not.toHaveBeenCalled();
  });
});

// ─── Accessibility Role ────────────────────────────────────────────────────

describe('Checkbox -- role', () => {
  it('has the checkbox role', () => {
    render(<Checkbox />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('is focusable via keyboard', () => {
    render(<Checkbox label="Focus me" />);
    const checkbox = screen.getByRole('checkbox');
    checkbox.focus();
    expect(checkbox).toHaveFocus();
  });
});

// ─── Indeterminate ──────────────────────────────────────────────────────────

describe('Checkbox -- indeterminate', () => {
  it('sets the indeterminate property on the native input', () => {
    render(<Checkbox indeterminate />);
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.indeterminate).toBe(true);
  });

  it('clears indeterminate when prop changes', () => {
    const { rerender } = render(<Checkbox indeterminate />);
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.indeterminate).toBe(true);

    rerender(<Checkbox indeterminate={false} />);
    expect(checkbox.indeterminate).toBe(false);
  });
});

// ─── Ref Forwarding ─────────────────────────────────────────────────────────

describe('Checkbox -- ref forwarding', () => {
  it('forwards ref to the native input element', () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<Checkbox ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});

// ─── HTML Attributes ────────────────────────────────────────────────────────

describe('Checkbox -- HTML attributes', () => {
  it('passes through additional HTML attributes', () => {
    render(<Checkbox data-testid="my-checkbox" name="terms" />);
    const el = screen.getByTestId('my-checkbox');
    expect(el).toHaveAttribute('name', 'terms');
  });

  it('merges custom className on wrapper', () => {
    const { container } = render(<Checkbox className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
