import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PageShell } from './PageShell';
import type { PageShellTab } from './PageShell';

// ─── matchMedia mock (jsdom does not provide it) ────────────────────────────

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

// ─── Fixtures ────────────────────────────────────────────────────────────────

const sampleTabs: PageShellTab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'settings', label: 'Settings' },
  { id: 'billing', label: 'Billing', disabled: true },
];

// ─── Rendering ───────────────────────────────────────────────────────────────

describe('PageShell -- rendering', () => {
  it('renders title', () => {
    render(
      <PageShell title="My Page">
        <p>Content</p>
      </PageShell>,
    );
    expect(screen.getByRole('heading', { name: 'My Page', level: 1 })).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <PageShell title="My Page" description="Page description text">
        <p>Content</p>
      </PageShell>,
    );
    expect(screen.getByText('Page description text')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    render(
      <PageShell title="My Page">
        <p>Content</p>
      </PageShell>,
    );
    // Only the title and content should be present
    expect(screen.queryByText('Page description text')).not.toBeInTheDocument();
  });

  it('renders children in content area', () => {
    render(
      <PageShell title="My Page">
        <p>Content area text</p>
      </PageShell>,
    );
    expect(screen.getByText('Content area text')).toBeInTheDocument();
  });
});

// ─── Breadcrumbs ─────────────────────────────────────────────────────────────

describe('PageShell -- breadcrumbs', () => {
  it('renders breadcrumbs when provided', () => {
    render(
      <PageShell
        title="My Page"
        breadcrumbs={<nav aria-label="Breadcrumb"><span>Home / Page</span></nav>}
      >
        <p>Content</p>
      </PageShell>,
    );
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getByText('Home / Page')).toBeInTheDocument();
  });

  it('does not render breadcrumb container when not provided', () => {
    render(
      <PageShell title="My Page">
        <p>Content</p>
      </PageShell>,
    );
    expect(screen.queryByTestId('page-shell-breadcrumbs')).not.toBeInTheDocument();
  });
});

// ─── Actions ─────────────────────────────────────────────────────────────────

describe('PageShell -- actions', () => {
  it('renders actions slot when provided', () => {
    render(
      <PageShell
        title="My Page"
        actions={<button type="button">Create</button>}
      >
        <p>Content</p>
      </PageShell>,
    );
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });

  it('does not render actions container when not provided', () => {
    render(
      <PageShell title="My Page">
        <p>Content</p>
      </PageShell>,
    );
    expect(screen.queryByTestId('page-shell-actions')).not.toBeInTheDocument();
  });
});

// ─── Tabs ────────────────────────────────────────────────────────────────────

describe('PageShell -- tabs', () => {
  it('renders tabs with correct roles', () => {
    render(
      <PageShell title="My Page" tabs={sampleTabs} activeTab="overview">
        <p>Content</p>
      </PageShell>,
    );
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  it('marks the active tab with aria-selected', () => {
    render(
      <PageShell title="My Page" tabs={sampleTabs} activeTab="settings">
        <p>Content</p>
      </PageShell>,
    );
    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onTabChange when a tab is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <PageShell title="My Page" tabs={sampleTabs} activeTab="overview" onTabChange={onChange}>
        <p>Content</p>
      </PageShell>,
    );
    await user.click(screen.getByRole('tab', { name: 'Settings' }));
    expect(onChange).toHaveBeenCalledWith('settings');
  });

  it('does not call onTabChange for disabled tabs', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <PageShell title="My Page" tabs={sampleTabs} activeTab="overview" onTabChange={onChange}>
        <p>Content</p>
      </PageShell>,
    );
    await user.click(screen.getByRole('tab', { name: 'Billing' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('disabled tab has disabled attribute', () => {
    render(
      <PageShell title="My Page" tabs={sampleTabs} activeTab="overview">
        <p>Content</p>
      </PageShell>,
    );
    expect(screen.getByRole('tab', { name: 'Billing' })).toBeDisabled();
  });

  it('renders tab icons when provided', () => {
    const tabsWithIcons: PageShellTab[] = [
      { id: 'home', label: 'Home', icon: <span data-testid="home-icon">H</span> },
    ];
    render(
      <PageShell title="My Page" tabs={tabsWithIcons} activeTab="home">
        <p>Content</p>
      </PageShell>,
    );
    expect(screen.getByTestId('home-icon')).toBeInTheDocument();
  });

  it('does not render tab bar when tabs prop is not provided', () => {
    render(
      <PageShell title="My Page">
        <p>Content</p>
      </PageShell>,
    );
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });
});

// ─── Padding ─────────────────────────────────────────────────────────────────

describe('PageShell -- padding', () => {
  it('applies no padding classes with padding="none"', () => {
    const { container } = render(
      <PageShell title="My Page" padding="none">
        <p>Content</p>
      </PageShell>,
    );
    // The content wrapper should not have padding classes
    const contentArea = container.querySelector('.flex-1.min-h-0');
    expect(contentArea).toBeInTheDocument();
    // "none" means empty string padding, so no px-/py- classes on content
    expect(contentArea?.className).not.toMatch(/px-|py-/);
  });

  it('applies sm padding classes with padding="sm"', () => {
    const { container } = render(
      <PageShell title="My Page" padding="sm">
        <p>Content</p>
      </PageShell>,
    );
    const contentArea = container.querySelector('.flex-1.min-h-0');
    expect(contentArea?.className).toContain('px-3');
  });

  it('applies md padding by default', () => {
    const { container } = render(
      <PageShell title="My Page">
        <p>Content</p>
      </PageShell>,
    );
    const contentArea = container.querySelector('.flex-1.min-h-0');
    expect(contentArea?.className).toContain('px-4');
  });

  it('applies lg padding classes with padding="lg"', () => {
    const { container } = render(
      <PageShell title="My Page" padding="lg">
        <p>Content</p>
      </PageShell>,
    );
    const contentArea = container.querySelector('.flex-1.min-h-0');
    expect(contentArea?.className).toContain('px-6');
  });
});

// ─── className ──────────────────────────────────────────────────────────────

describe('PageShell -- className', () => {
  it('merges custom className with default classes', () => {
    const { container } = render(
      <PageShell title="My Page" className="my-custom-class">
        <p>Content</p>
      </PageShell>,
    );
    const root = container.firstElementChild;
    expect(root?.className).toContain('my-custom-class');
    expect(root?.className).toContain('flex');
    expect(root?.className).toContain('flex-col');
  });

  it('passes through additional HTML attributes', () => {
    render(
      <PageShell title="My Page" data-testid="my-shell" id="shell-root">
        <p>Content</p>
      </PageShell>,
    );
    const shell = screen.getByTestId('my-shell');
    expect(shell).toHaveAttribute('id', 'shell-root');
  });
});
