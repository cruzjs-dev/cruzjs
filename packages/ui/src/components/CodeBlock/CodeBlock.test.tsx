import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CodeBlock } from './CodeBlock';

// ─── matchMedia mock (jsdom does not provide it) ──────────────────────────────

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

beforeEach(() => {
  mockMatchMedia(false);
});

// ─── Sample code ─────────────────────────────────────────────────────────────

const sampleCode = `const x = 1;
const y = 2;
const z = x + y;`;

// ─── Renders code content ────────────────────────────────────────────────────

describe('CodeBlock -- renders code content', () => {
  it('renders the code text', () => {
    render(<CodeBlock code={sampleCode} />);
    expect(screen.getByText('const x = 1;')).toBeInTheDocument();
    expect(screen.getByText('const y = 2;')).toBeInTheDocument();
    expect(screen.getByText('const z = x + y;')).toBeInTheDocument();
  });

  it('renders code inside pre and code elements', () => {
    const { container } = render(<CodeBlock code={sampleCode} />);
    const pre = container.querySelector('pre');
    expect(pre).toBeInTheDocument();
    const code = container.querySelector('code');
    expect(code).toBeInTheDocument();
    expect(pre?.contains(code!)).toBe(true);
  });
});

// ─── Renders filename ────────────────────────────────────────────────────────

describe('CodeBlock -- renders filename', () => {
  it('renders the filename in the title bar', () => {
    render(<CodeBlock code={sampleCode} filename="app.tsx" />);
    expect(screen.getByTestId('codeblock-filename')).toHaveTextContent('app.tsx');
  });

  it('does not render filename when not provided', () => {
    render(<CodeBlock code={sampleCode} />);
    expect(screen.queryByTestId('codeblock-filename')).not.toBeInTheDocument();
  });
});

// ─── Renders language label ──────────────────────────────────────────────────

describe('CodeBlock -- renders language label', () => {
  it('renders the language badge', () => {
    render(<CodeBlock code={sampleCode} language="typescript" />);
    expect(screen.getByTestId('codeblock-language')).toHaveTextContent('typescript');
  });

  it('does not render language badge when not provided', () => {
    render(<CodeBlock code={sampleCode} />);
    expect(screen.queryByTestId('codeblock-language')).not.toBeInTheDocument();
  });

  it('renders both filename and language together', () => {
    render(<CodeBlock code={sampleCode} filename="app.tsx" language="tsx" />);
    expect(screen.getByTestId('codeblock-filename')).toHaveTextContent('app.tsx');
    expect(screen.getByTestId('codeblock-language')).toHaveTextContent('tsx');
  });
});

// ─── Line numbers shown/hidden ───────────────────────────────────────────────

describe('CodeBlock -- line numbers shown/hidden', () => {
  it('does not show line numbers by default', () => {
    const { container } = render(<CodeBlock code={sampleCode} />);
    // Line numbers are aria-hidden spans with numeric content
    const lineNums = container.querySelectorAll('[aria-hidden="true"]');
    // Filter to only numeric text content (not SVGs)
    const numericSpans = Array.from(lineNums).filter(
      (el) => el.tagName === 'SPAN' && /^\d+$/.test(el.textContent ?? ''),
    );
    expect(numericSpans.length).toBe(0);
  });

  it('shows line numbers when showLineNumbers is true', () => {
    const { container } = render(<CodeBlock code={sampleCode} showLineNumbers />);
    const lineNums = container.querySelectorAll('[aria-hidden="true"]');
    const numericSpans = Array.from(lineNums).filter(
      (el) => el.tagName === 'SPAN' && /^\d+$/.test(el.textContent ?? ''),
    );
    expect(numericSpans.length).toBe(3);
    expect(numericSpans[0]).toHaveTextContent('1');
    expect(numericSpans[1]).toHaveTextContent('2');
    expect(numericSpans[2]).toHaveTextContent('3');
  });
});

// ─── Copy button ─────────────────────────────────────────────────────────────

describe('CodeBlock -- copy button', () => {
  it('renders copy button by default', () => {
    render(<CodeBlock code={sampleCode} />);
    expect(screen.getByRole('button', { name: 'Copy code' })).toBeInTheDocument();
  });

  it('does not render copy button when showCopyButton is false', () => {
    render(<CodeBlock code={sampleCode} showCopyButton={false} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('transitions to copied state on click', async () => {
    const user = userEvent.setup();
    render(<CodeBlock code={sampleCode} />);
    await user.click(screen.getByRole('button', { name: 'Copy code' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
    });
  });
});

// ─── Highlighted lines ───────────────────────────────────────────────────────

describe('CodeBlock -- highlighted lines', () => {
  it('applies highlight class to specified lines', () => {
    const { container } = render(
      <CodeBlock code={sampleCode} highlightLines={[1, 3]} />,
    );
    const highlighted = container.querySelectorAll('.codeblock-highlight');
    expect(highlighted.length).toBe(2);
  });

  it('applies highlight style to specified lines', () => {
    const { container } = render(
      <CodeBlock code={sampleCode} highlightLines={[2]} />,
    );
    const highlighted = container.querySelector('.codeblock-highlight');
    expect(highlighted).toBeInTheDocument();
    expect(highlighted).toHaveStyle({
      backgroundColor:
        'color-mix(in srgb, var(--color-primary) 15%, var(--color-dark-surface))',
    });
  });

  it('does not apply highlight to non-specified lines', () => {
    const { container } = render(
      <CodeBlock code={sampleCode} highlightLines={[2]} />,
    );
    // There are 3 lines total, only 1 should be highlighted
    const allLines = container.querySelectorAll('pre code > div');
    expect(allLines.length).toBe(3);
    const highlighted = container.querySelectorAll('.codeblock-highlight');
    expect(highlighted.length).toBe(1);
  });
});

// ─── Custom className ────────────────────────────────────────────────────────

describe('CodeBlock -- custom className', () => {
  it('merges custom className onto the root element', () => {
    const { container } = render(
      <CodeBlock code={sampleCode} className="my-custom-class" />,
    );
    expect(container.firstChild).toHaveClass('my-custom-class');
  });
});

// ─── Horizontal scroll ──────────────────────────────────────────────────────

describe('CodeBlock -- horizontal scroll', () => {
  it('has overflow-x-auto on the scroll container', () => {
    render(<CodeBlock code={sampleCode} />);
    const scrollContainer = screen.getByTestId('codeblock-scroll-container');
    expect(scrollContainer).toHaveClass('overflow-x-auto');
  });
});

// ─── Ref forwarding ──────────────────────────────────────────────────────────

describe('CodeBlock -- ref forwarding', () => {
  it('forwards ref to the root div', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<CodeBlock ref={ref} code={sampleCode} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
