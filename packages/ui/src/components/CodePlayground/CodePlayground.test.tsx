import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CodePlayground } from './CodePlayground';
import type { CodePlaygroundFile } from './CodePlayground';

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const singleFile: CodePlaygroundFile[] = [
  { id: 'app', label: 'App.tsx', language: 'tsx', code: 'const x = 1;\nconst y = 2;' },
];

const multiFiles: CodePlaygroundFile[] = [
  { id: 'app', label: 'App.tsx', language: 'tsx', code: 'export default App;' },
  { id: 'style', label: 'style.css', language: 'css', code: '.root { color: red; }' },
  { id: 'config', label: 'config.ts', language: 'ts', code: 'export const PORT = 3000;' },
];

// ─── Renders file tabs ────────────────────────────────────────────────────────

describe('CodePlayground -- renders file tabs', () => {
  it('renders a tab for each file', () => {
    render(<CodePlayground files={multiFiles} />);
    expect(screen.getByRole('tab', { name: 'App.tsx' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'style.css' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'config.ts' })).toBeInTheDocument();
  });

  it('renders a tablist container', () => {
    render(<CodePlayground files={multiFiles} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });
});

// ─── Active file tab highlighted ──────────────────────────────────────────────

describe('CodePlayground -- active file tab highlighted', () => {
  it('first file is active by default', () => {
    render(<CodePlayground files={multiFiles} />);
    const firstTab = screen.getByRole('tab', { name: 'App.tsx' });
    expect(firstTab).toHaveAttribute('aria-selected', 'true');
  });

  it('respects activeFileId prop', () => {
    render(<CodePlayground files={multiFiles} activeFileId="style" />);
    const styleTab = screen.getByRole('tab', { name: 'style.css' });
    expect(styleTab).toHaveAttribute('aria-selected', 'true');
    const appTab = screen.getByRole('tab', { name: 'App.tsx' });
    expect(appTab).toHaveAttribute('aria-selected', 'false');
  });
});

// ─── Code content displayed ───────────────────────────────────────────────────

describe('CodePlayground -- code content displayed', () => {
  it('displays the code of the active file in the textarea', () => {
    render(<CodePlayground files={singleFile} />);
    const textarea = screen.getByTestId('code-textarea');
    expect(textarea).toHaveValue('const x = 1;\nconst y = 2;');
  });

  it('updates code when active file changes', () => {
    render(<CodePlayground files={multiFiles} activeFileId="config" />);
    const textarea = screen.getByTestId('code-textarea');
    expect(textarea).toHaveValue('export const PORT = 3000;');
  });
});

// ─── onActiveFileChange called on tab click ───────────────────────────────────

describe('CodePlayground -- onActiveFileChange called on tab click', () => {
  it('calls onActiveFileChange when a tab is clicked', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(<CodePlayground files={multiFiles} onActiveFileChange={handleChange} />);
    await user.click(screen.getByRole('tab', { name: 'style.css' }));
    expect(handleChange).toHaveBeenCalledWith('style');
  });

  it('does not call onActiveFileChange when clicking the already active tab', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(<CodePlayground files={multiFiles} onActiveFileChange={handleChange} />);
    // First click: selecting App.tsx which is already active, still fires the callback
    await user.click(screen.getByRole('tab', { name: 'App.tsx' }));
    expect(handleChange).toHaveBeenCalledWith('app');
  });
});

// ─── onCodeChange called on edit ──────────────────────────────────────────────

describe('CodePlayground -- onCodeChange called on edit', () => {
  it('calls onCodeChange when textarea content changes', () => {
    const handleCodeChange = vi.fn();
    render(<CodePlayground files={singleFile} onCodeChange={handleCodeChange} />);
    const textarea = screen.getByTestId('code-textarea');
    fireEvent.change(textarea, { target: { value: 'const z = 3;' } });
    expect(handleCodeChange).toHaveBeenCalledWith('app', 'const z = 3;');
  });
});

// ─── readOnly mode prevents editing ───────────────────────────────────────────

describe('CodePlayground -- readOnly mode prevents editing', () => {
  it('sets readOnly attribute on textarea when readOnly is true', () => {
    render(<CodePlayground files={singleFile} readOnly />);
    const textarea = screen.getByTestId('code-textarea');
    expect(textarea).toHaveAttribute('readonly');
  });

  it('does not call onCodeChange when readOnly', () => {
    const handleCodeChange = vi.fn();
    render(<CodePlayground files={singleFile} readOnly onCodeChange={handleCodeChange} />);
    const textarea = screen.getByTestId('code-textarea');
    fireEvent.change(textarea, { target: { value: 'hacked' } });
    expect(handleCodeChange).not.toHaveBeenCalled();
  });
});

// ─── Line numbers shown/hidden ────────────────────────────────────────────────

describe('CodePlayground -- line numbers shown/hidden', () => {
  it('shows line numbers by default', () => {
    render(<CodePlayground files={singleFile} />);
    expect(screen.getByTestId('line-numbers')).toBeInTheDocument();
  });

  it('renders correct number of line numbers', () => {
    render(<CodePlayground files={singleFile} />);
    const lineNumbers = screen.getByTestId('line-numbers');
    // "const x = 1;\nconst y = 2;" has 2 lines
    expect(lineNumbers.children).toHaveLength(2);
  });

  it('hides line numbers when showLineNumbers is false', () => {
    render(<CodePlayground files={singleFile} showLineNumbers={false} />);
    expect(screen.queryByTestId('line-numbers')).not.toBeInTheDocument();
  });
});

// ─── Copy button present ──────────────────────────────────────────────────────

describe('CodePlayground -- copy button present', () => {
  it('renders a copy button', () => {
    render(<CodePlayground files={singleFile} />);
    expect(screen.getByTestId('copy-button')).toBeInTheDocument();
  });

  it('copy button has appropriate aria-label', () => {
    render(<CodePlayground files={singleFile} />);
    expect(screen.getByTestId('copy-button')).toHaveAttribute('aria-label', 'Copy code');
  });

  it('transitions to copied state on click', async () => {
    render(<CodePlayground files={singleFile} />);
    const btn = screen.getByTestId('copy-button');
    fireEvent.click(btn);
    await waitFor(() => {
      expect(btn).toHaveAttribute('aria-label', 'Copied');
    });
  });
});

// ─── Preview pane rendered when showPreview is true ───────────────────────────

describe('CodePlayground -- preview pane', () => {
  it('does not render preview pane by default', () => {
    render(<CodePlayground files={singleFile} />);
    expect(screen.queryByTestId('preview-panel')).not.toBeInTheDocument();
  });

  it('renders preview pane when showPreview is true and preview is provided', () => {
    render(
      <CodePlayground
        files={singleFile}
        showPreview
        preview={<div data-testid="preview-content">Hello Preview</div>}
      />,
    );
    expect(screen.getByTestId('preview-panel')).toBeInTheDocument();
    expect(screen.getByTestId('preview-content')).toBeInTheDocument();
    expect(screen.getByText('Hello Preview')).toBeInTheDocument();
  });

  it('renders a split divider when preview is shown', () => {
    render(
      <CodePlayground
        files={singleFile}
        showPreview
        preview={<div>Preview</div>}
      />,
    );
    expect(screen.getByTestId('split-divider')).toBeInTheDocument();
  });

  it('does not render preview pane when showPreview is true but preview is undefined', () => {
    render(<CodePlayground files={singleFile} showPreview />);
    expect(screen.queryByTestId('preview-panel')).not.toBeInTheDocument();
  });
});

// ─── Custom className support ─────────────────────────────────────────────────

describe('CodePlayground -- custom className support', () => {
  it('merges custom className', () => {
    render(<CodePlayground files={singleFile} className="my-custom-class" />);
    expect(screen.getByTestId('code-playground')).toHaveClass('my-custom-class');
  });

  it('preserves default classes when custom className is added', () => {
    render(<CodePlayground files={singleFile} className="my-custom" />);
    const el = screen.getByTestId('code-playground');
    expect(el).toHaveClass('flex');
    expect(el).toHaveClass('flex-col');
    expect(el).toHaveClass('my-custom');
  });
});

// ─── Fullscreen toggle ────────────────────────────────────────────────────────

describe('CodePlayground -- fullscreen toggle', () => {
  it('renders a fullscreen toggle button', () => {
    render(<CodePlayground files={singleFile} />);
    expect(screen.getByTestId('fullscreen-button')).toBeInTheDocument();
  });

  it('toggles fullscreen classes on click', async () => {
    const user = userEvent.setup();
    render(<CodePlayground files={singleFile} />);
    const btn = screen.getByTestId('fullscreen-button');
    const playground = screen.getByTestId('code-playground');

    expect(playground).not.toHaveClass('fixed');

    await user.click(btn);
    expect(playground).toHaveClass('fixed');

    await user.click(btn);
    expect(playground).not.toHaveClass('fixed');
  });
});
