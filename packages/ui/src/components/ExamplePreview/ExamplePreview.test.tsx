import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ExamplePreview } from './ExamplePreview';

// ─── Sample data ────────────────────────────────────────────────────────────

const sampleCode = `const greeting = "Hello";
console.log(greeting);`;

// ─── Renders preview content ────────────────────────────────────────────────

describe('ExamplePreview -- renders preview content', () => {
  it('renders children in the preview area', () => {
    render(
      <ExamplePreview>
        <button>Click me</button>
      </ExamplePreview>,
    );
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('renders children inside the preview-content container', () => {
    render(
      <ExamplePreview>
        <span data-testid="inner">Hello</span>
      </ExamplePreview>,
    );
    const previewContent = screen.getByTestId('preview-content');
    expect(previewContent).toBeInTheDocument();
    expect(screen.getByTestId('inner')).toBeInTheDocument();
  });
});

// ─── Code hidden by default ────────────────────────────────────────────────

describe('ExamplePreview -- code hidden by default', () => {
  it('does not show code area by default', () => {
    render(
      <ExamplePreview code={sampleCode}>
        <div>Preview</div>
      </ExamplePreview>,
    );
    expect(screen.queryByTestId('code-area')).not.toBeInTheDocument();
  });

  it('shows "Show Code" button when code is provided', () => {
    render(
      <ExamplePreview code={sampleCode}>
        <div>Preview</div>
      </ExamplePreview>,
    );
    expect(screen.getByText('Show Code')).toBeInTheDocument();
  });
});

// ─── Toggle shows/hides code ────────────────────────────────────────────────

describe('ExamplePreview -- toggle shows/hides code', () => {
  it('shows code area when toggle is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ExamplePreview code={sampleCode}>
        <div>Preview</div>
      </ExamplePreview>,
    );

    await user.click(screen.getByText('Show Code'));

    expect(screen.getByTestId('code-area')).toBeInTheDocument();
    expect(screen.getByText('Hide Code')).toBeInTheDocument();
  });

  it('hides code area when toggled twice', async () => {
    const user = userEvent.setup();
    render(
      <ExamplePreview code={sampleCode}>
        <div>Preview</div>
      </ExamplePreview>,
    );

    await user.click(screen.getByText('Show Code'));
    expect(screen.getByTestId('code-area')).toBeInTheDocument();

    await user.click(screen.getByText('Hide Code'));
    expect(screen.queryByTestId('code-area')).not.toBeInTheDocument();
  });
});

// ─── Code content displayed when shown ──────────────────────────────────────

describe('ExamplePreview -- code content displayed when shown', () => {
  it('displays code text in the code area', async () => {
    const user = userEvent.setup();
    render(
      <ExamplePreview code={sampleCode}>
        <div>Preview</div>
      </ExamplePreview>,
    );

    await user.click(screen.getByText('Show Code'));

    expect(screen.getByText('const greeting = "Hello";')).toBeInTheDocument();
    expect(screen.getByText('console.log(greeting);')).toBeInTheDocument();
  });

  it('renders code inside pre and code elements', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ExamplePreview code={sampleCode}>
        <div>Preview</div>
      </ExamplePreview>,
    );

    await user.click(screen.getByText('Show Code'));

    const pre = container.querySelector('pre');
    expect(pre).toBeInTheDocument();
    const code = container.querySelector('code');
    expect(code).toBeInTheDocument();
    expect(pre?.contains(code!)).toBe(true);
  });
});

// ─── Title renders ──────────────────────────────────────────────────────────

describe('ExamplePreview -- title renders', () => {
  it('renders the title text', () => {
    render(
      <ExamplePreview title="Button Example" code={sampleCode}>
        <div>Preview</div>
      </ExamplePreview>,
    );
    expect(screen.getByTestId('example-preview-title')).toHaveTextContent('Button Example');
  });

  it('does not render title element when not provided', () => {
    render(
      <ExamplePreview code={sampleCode}>
        <div>Preview</div>
      </ExamplePreview>,
    );
    expect(screen.queryByTestId('example-preview-title')).not.toBeInTheDocument();
  });
});

// ─── Description renders ────────────────────────────────────────────────────

describe('ExamplePreview -- description renders', () => {
  it('renders the description text', () => {
    render(
      <ExamplePreview title="Example" description="A helpful description" code={sampleCode}>
        <div>Preview</div>
      </ExamplePreview>,
    );
    expect(screen.getByTestId('example-preview-description')).toHaveTextContent(
      'A helpful description',
    );
  });

  it('does not render description element when not provided', () => {
    render(
      <ExamplePreview title="Example" code={sampleCode}>
        <div>Preview</div>
      </ExamplePreview>,
    );
    expect(screen.queryByTestId('example-preview-description')).not.toBeInTheDocument();
  });
});

// ─── defaultShowCode=true shows code initially ─────────────────────────────

describe('ExamplePreview -- defaultShowCode=true shows code initially', () => {
  it('shows code area when defaultShowCode is true', () => {
    render(
      <ExamplePreview code={sampleCode} defaultShowCode>
        <div>Preview</div>
      </ExamplePreview>,
    );
    expect(screen.getByTestId('code-area')).toBeInTheDocument();
    expect(screen.getByText('Hide Code')).toBeInTheDocument();
  });

  it('displays code content immediately', () => {
    render(
      <ExamplePreview code={sampleCode} defaultShowCode>
        <div>Preview</div>
      </ExamplePreview>,
    );
    expect(screen.getByText('const greeting = "Hello";')).toBeInTheDocument();
  });
});

// ─── Custom className ───────────────────────────────────────────────────────

describe('ExamplePreview -- custom className', () => {
  it('merges custom className onto the root element', () => {
    const { container } = render(
      <ExamplePreview className="my-custom-class">
        <div>Preview</div>
      </ExamplePreview>,
    );
    expect(container.firstChild).toHaveClass('my-custom-class');
  });

  it('preserves default classes alongside custom className', () => {
    const { container } = render(
      <ExamplePreview className="my-custom-class">
        <div>Preview</div>
      </ExamplePreview>,
    );
    expect(container.firstChild).toHaveClass('rounded-xl');
    expect(container.firstChild).toHaveClass('my-custom-class');
  });
});

// ─── Resizable adds resize handle ───────────────────────────────────────────

describe('ExamplePreview -- resizable adds resize handle', () => {
  it('renders resize handle when resizable is true', () => {
    render(
      <ExamplePreview resizable>
        <div>Preview</div>
      </ExamplePreview>,
    );
    expect(screen.getByTestId('resize-handle')).toBeInTheDocument();
  });

  it('does not render resize handle by default', () => {
    render(
      <ExamplePreview>
        <div>Preview</div>
      </ExamplePreview>,
    );
    expect(screen.queryByTestId('resize-handle')).not.toBeInTheDocument();
  });

  it('resize handle has separator role', () => {
    render(
      <ExamplePreview resizable>
        <div>Preview</div>
      </ExamplePreview>,
    );
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });
});

// ─── Ref forwarding ─────────────────────────────────────────────────────────

describe('ExamplePreview -- ref forwarding', () => {
  it('forwards ref to the root div', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(
      <ExamplePreview ref={ref}>
        <div>Preview</div>
      </ExamplePreview>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

// ─── Background toggle ─────────────────────────────────────────────────────

describe('ExamplePreview -- background toggle', () => {
  it('renders background toggle button', () => {
    render(
      <ExamplePreview code={sampleCode}>
        <div>Preview</div>
      </ExamplePreview>,
    );
    expect(screen.getByTestId('background-toggle')).toBeInTheDocument();
  });

  it('toggles preview background on click', async () => {
    const user = userEvent.setup();
    render(
      <ExamplePreview code={sampleCode}>
        <div>Preview</div>
      </ExamplePreview>,
    );

    const previewContent = screen.getByTestId('preview-content');
    expect(previewContent).toHaveClass('bg-surface');

    await user.click(screen.getByTestId('background-toggle'));
    expect(previewContent).toHaveClass('bg-dark-surface');

    await user.click(screen.getByTestId('background-toggle'));
    expect(previewContent).toHaveClass('bg-surface');
  });
});

// ─── No code prop ───────────────────────────────────────────────────────────

describe('ExamplePreview -- no code prop', () => {
  it('does not render code toggle when code is not provided', () => {
    render(
      <ExamplePreview>
        <div>Preview</div>
      </ExamplePreview>,
    );
    expect(screen.queryByTestId('code-toggle')).not.toBeInTheDocument();
  });
});
