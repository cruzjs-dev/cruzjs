import { render, screen } from '@testing-library/react';
import { ParameterField, ParameterFieldGroup } from './ParameterField';

// --- Basic Rendering ---

describe('ParameterField -- renders name', () => {
  it('renders the parameter name', () => {
    render(<ParameterField name="userId" />);
    expect(screen.getByText('userId')).toBeInTheDocument();
  });

  it('renders name with monospace font', () => {
    render(<ParameterField name="userId" />);
    const nameEl = screen.getByText('userId');
    expect(nameEl).toHaveClass('font-mono');
    expect(nameEl).toHaveClass('font-semibold');
  });
});

// --- Type Rendering ---

describe('ParameterField -- renders type', () => {
  it('renders the type annotation', () => {
    render(<ParameterField name="userId" type="string" />);
    expect(screen.getByText('string')).toBeInTheDocument();
  });

  it('renders type with monospace styling', () => {
    render(<ParameterField name="userId" type="string" />);
    const typeEl = screen.getByText('string');
    expect(typeEl).toHaveClass('font-mono');
    expect(typeEl).toHaveClass('text-text-tertiary');
  });

  it('does not render type when not provided', () => {
    const { container } = render(<ParameterField name="userId" />);
    const monoElements = container.querySelectorAll('.text-text-tertiary.font-mono');
    expect(monoElements).toHaveLength(0);
  });
});

// --- Required Badge ---

describe('ParameterField -- required badge', () => {
  it('shows required badge when required is true', () => {
    render(<ParameterField name="userId" required />);
    expect(screen.getByText('required')).toBeInTheDocument();
  });

  it('applies danger styling to required badge', () => {
    render(<ParameterField name="userId" required />);
    const badge = screen.getByText('required');
    expect(badge).toHaveClass('bg-danger-subtle');
    expect(badge).toHaveClass('text-danger');
  });
});

// --- Optional Badge ---

describe('ParameterField -- optional when not required', () => {
  it('shows optional badge when required is false', () => {
    render(<ParameterField name="userId" />);
    expect(screen.getByText('optional')).toBeInTheDocument();
  });

  it('shows optional badge by default', () => {
    render(<ParameterField name="userId" required={false} />);
    const badge = screen.getByText('optional');
    expect(badge).toHaveClass('bg-surface-lighter');
    expect(badge).toHaveClass('text-text-muted');
  });

  it('does not show optional when required is true', () => {
    render(<ParameterField name="userId" required />);
    expect(screen.queryByText('optional')).not.toBeInTheDocument();
  });
});

// --- Description ---

describe('ParameterField -- description renders', () => {
  it('renders text description', () => {
    render(<ParameterField name="userId" description="The unique user identifier." />);
    expect(screen.getByText('The unique user identifier.')).toBeInTheDocument();
  });

  it('renders JSX description', () => {
    render(
      <ParameterField
        name="userId"
        description={<span data-testid="custom-desc">Custom content</span>}
      />,
    );
    expect(screen.getByTestId('custom-desc')).toBeInTheDocument();
  });

  it('does not render description container when not provided', () => {
    const { container } = render(<ParameterField name="userId" />);
    const descEl = container.querySelector('.text-text-secondary');
    expect(descEl).not.toBeInTheDocument();
  });
});

// --- Default Value ---

describe('ParameterField -- default value shown', () => {
  it('renders default value', () => {
    render(<ParameterField name="limit" defaultValue="10" />);
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('renders Default: label', () => {
    render(<ParameterField name="limit" defaultValue="10" />);
    expect(screen.getByText(/Default:/)).toBeInTheDocument();
  });

  it('does not render default value section when not provided', () => {
    const { container } = render(<ParameterField name="limit" />);
    expect(screen.queryByText(/Default:/)).not.toBeInTheDocument();
  });
});

// --- Deprecated Styling ---

describe('ParameterField -- deprecated styling', () => {
  it('adds strikethrough to name when deprecated', () => {
    render(<ParameterField name="oldField" deprecated />);
    const nameEl = screen.getByText('oldField');
    expect(nameEl).toHaveClass('line-through');
  });

  it('shows deprecated badge', () => {
    render(<ParameterField name="oldField" deprecated />);
    expect(screen.getByText('deprecated')).toBeInTheDocument();
  });

  it('applies warning styling to deprecated badge', () => {
    render(<ParameterField name="oldField" deprecated />);
    const badge = screen.getByText('deprecated');
    expect(badge).toHaveClass('bg-warning-subtle');
    expect(badge).toHaveClass('text-warning-text');
  });

  it('does not strikethrough name when not deprecated', () => {
    render(<ParameterField name="activeField" />);
    const nameEl = screen.getByText('activeField');
    expect(nameEl).not.toHaveClass('line-through');
  });
});

// --- Nested Children ---

describe('ParameterField -- nested children render', () => {
  it('renders nested parameter fields', () => {
    render(
      <ParameterField name="options" type="object">
        <ParameterField name="color" type="string" />
        <ParameterField name="size" type="number" />
      </ParameterField>,
    );
    expect(screen.getByText('options')).toBeInTheDocument();
    expect(screen.getByText('color')).toBeInTheDocument();
    expect(screen.getByText('size')).toBeInTheDocument();
  });

  it('renders nested children in an indented container', () => {
    const { container } = render(
      <ParameterField name="options" type="object">
        <ParameterField name="color" type="string" />
      </ParameterField>,
    );
    const nestedContainer = container.querySelector('.ml-4.pl-3.border-l');
    expect(nestedContainer).toBeInTheDocument();
  });

  it('does not render nested container when no children', () => {
    const { container } = render(<ParameterField name="simple" />);
    const nestedContainer = container.querySelector('.ml-4');
    expect(nestedContainer).not.toBeInTheDocument();
  });
});

// --- ParameterFieldGroup ---

describe('ParameterFieldGroup -- with title', () => {
  it('renders group title', () => {
    render(
      <ParameterFieldGroup title="Query Parameters">
        <ParameterField name="page" type="number" />
      </ParameterFieldGroup>,
    );
    expect(screen.getByText('Query Parameters')).toBeInTheDocument();
  });

  it('renders children inside group', () => {
    render(
      <ParameterFieldGroup title="Body">
        <ParameterField name="email" type="string" required />
      </ParameterFieldGroup>,
    );
    expect(screen.getByText('email')).toBeInTheDocument();
  });

  it('renders without title', () => {
    const { container } = render(
      <ParameterFieldGroup>
        <ParameterField name="id" type="string" />
      </ParameterFieldGroup>,
    );
    expect(container.querySelector('h3')).not.toBeInTheDocument();
    expect(screen.getByText('id')).toBeInTheDocument();
  });
});

// --- Custom className ---

describe('ParameterField -- custom className', () => {
  it('merges custom className on ParameterField', () => {
    const { container } = render(
      <ParameterField name="test" className="custom-class" />,
    );
    expect(container.firstChild).toHaveClass('custom-class');
    expect(container.firstChild).toHaveClass('border-b');
  });

  it('merges custom className on ParameterFieldGroup', () => {
    const { container } = render(
      <ParameterFieldGroup className="group-class">
        <ParameterField name="test" />
      </ParameterFieldGroup>,
    );
    expect(container.firstChild).toHaveClass('group-class');
  });
});

// --- Ref Forwarding ---

describe('ParameterField -- ref forwarding', () => {
  it('forwards ref on ParameterField', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<ParameterField ref={ref} name="test" />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('forwards ref on ParameterFieldGroup', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(
      <ParameterFieldGroup ref={ref}>
        <ParameterField name="test" />
      </ParameterFieldGroup>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
