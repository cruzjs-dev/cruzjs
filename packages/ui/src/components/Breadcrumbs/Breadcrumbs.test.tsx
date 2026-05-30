import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Breadcrumbs } from './Breadcrumbs';
import type { BreadcrumbItem, BreadcrumbsSize } from './Breadcrumbs';

// ─── Basic Rendering ────────────────────────────────────────────────────────

describe('Breadcrumbs -- renders items', () => {
  it('renders all item labels', () => {
    const items: BreadcrumbItem[] = [
      { label: 'Home', href: '/' },
      { label: 'Products', href: '/products' },
      { label: 'Widget' },
    ];
    render(<Breadcrumbs items={items} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('Widget')).toBeInTheDocument();
  });

  it('renders a nav element with aria-label', () => {
    render(<Breadcrumbs items={[{ label: 'Home' }]} />);
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(nav).toBeInTheDocument();
  });

  it('renders an ordered list', () => {
    render(<Breadcrumbs items={[{ label: 'Home' }, { label: 'Page' }]} />);
    const list = screen.getByRole('list');
    expect(list).toBeInTheDocument();
  });
});

// ─── Last Item (Current Page) ───────────────────────────────────────────────

describe('Breadcrumbs -- last item', () => {
  it('renders last item with aria-current="page"', () => {
    const items: BreadcrumbItem[] = [
      { label: 'Home', href: '/' },
      { label: 'Current Page' },
    ];
    render(<Breadcrumbs items={items} />);
    const current = screen.getByText('Current Page');
    expect(current.closest('[aria-current="page"]')).toBeInTheDocument();
  });

  it('does not render last item as a link even if href is provided', () => {
    const items: BreadcrumbItem[] = [
      { label: 'Home', href: '/' },
      { label: 'Current', href: '/current' },
    ];
    render(<Breadcrumbs items={items} />);
    const currentEl = screen.getByText('Current');
    // The parent span (with aria-current) should not be an anchor
    const ariaCurrent = currentEl.closest('[aria-current="page"]');
    expect(ariaCurrent).toBeInTheDocument();
    expect(ariaCurrent!.tagName).not.toBe('A');
  });

  it('renders non-last items as links when href is provided', () => {
    const items: BreadcrumbItem[] = [
      { label: 'Home', href: '/' },
      { label: 'Products', href: '/products' },
      { label: 'Widget' },
    ];
    render(<Breadcrumbs items={items} />);
    const homeLink = screen.getByRole('link', { name: 'Home' });
    expect(homeLink).toHaveAttribute('href', '/');
    const productsLink = screen.getByRole('link', { name: 'Products' });
    expect(productsLink).toHaveAttribute('href', '/products');
  });
});

// ─── Separators ─────────────────────────────────────────────────────────────

describe('Breadcrumbs -- separator', () => {
  it('renders default separator between items', () => {
    const items: BreadcrumbItem[] = [
      { label: 'Home', href: '/' },
      { label: 'Products', href: '/products' },
      { label: 'Widget' },
    ];
    render(<Breadcrumbs items={items} />);
    const separators = screen.getAllByText('/');
    expect(separators).toHaveLength(2);
  });

  it('separators have aria-hidden', () => {
    const items: BreadcrumbItem[] = [
      { label: 'A', href: '/' },
      { label: 'B' },
    ];
    render(<Breadcrumbs items={items} />);
    const separator = screen.getByText('/');
    expect(separator).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders custom separator', () => {
    const items: BreadcrumbItem[] = [
      { label: 'Home', href: '/' },
      { label: 'Page' },
    ];
    render(<Breadcrumbs items={items} separator=">" />);
    expect(screen.getByText('>')).toBeInTheDocument();
    expect(screen.queryByText('/')).not.toBeInTheDocument();
  });

  it('renders custom JSX separator', () => {
    const items: BreadcrumbItem[] = [
      { label: 'Home', href: '/' },
      { label: 'Page' },
    ];
    render(<Breadcrumbs items={items} separator={<span data-testid="custom-sep">--</span>} />);
    expect(screen.getByTestId('custom-sep')).toBeInTheDocument();
  });
});

// ─── maxItems Collapse ──────────────────────────────────────────────────────

describe('Breadcrumbs -- maxItems collapse', () => {
  const sixItems: BreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Category', href: '/cat' },
    { label: 'Subcategory', href: '/sub' },
    { label: 'Section', href: '/sec' },
    { label: 'Detail', href: '/detail' },
    { label: 'Current Page' },
  ];

  it('shows ellipsis button when items exceed maxItems', () => {
    render(<Breadcrumbs items={sixItems} maxItems={3} />);
    const ellipsis = screen.getByRole('button', { name: 'Show all breadcrumb items' });
    expect(ellipsis).toBeInTheDocument();
  });

  it('shows first item and last (maxItems-1) items when collapsed', () => {
    render(<Breadcrumbs items={sixItems} maxItems={3} />);
    // First item visible
    expect(screen.getByText('Home')).toBeInTheDocument();
    // Last 2 items visible (maxItems - 1 = 2)
    expect(screen.getByText('Detail')).toBeInTheDocument();
    expect(screen.getByText('Current Page')).toBeInTheDocument();
    // Middle items hidden
    expect(screen.queryByText('Category')).not.toBeInTheDocument();
    expect(screen.queryByText('Subcategory')).not.toBeInTheDocument();
    expect(screen.queryByText('Section')).not.toBeInTheDocument();
  });

  it('does not collapse when items equal maxItems', () => {
    const threeItems: BreadcrumbItem[] = [
      { label: 'Home', href: '/' },
      { label: 'Products', href: '/products' },
      { label: 'Widget' },
    ];
    render(<Breadcrumbs items={threeItems} maxItems={3} />);
    expect(screen.queryByRole('button', { name: 'Show all breadcrumb items' })).not.toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('Widget')).toBeInTheDocument();
  });

  it('does not collapse when items fewer than maxItems', () => {
    const twoItems: BreadcrumbItem[] = [
      { label: 'Home', href: '/' },
      { label: 'Page' },
    ];
    render(<Breadcrumbs items={twoItems} maxItems={5} />);
    expect(screen.queryByRole('button', { name: 'Show all breadcrumb items' })).not.toBeInTheDocument();
  });
});

// ─── Expand Ellipsis ────────────────────────────────────────────────────────

describe('Breadcrumbs -- expand ellipsis', () => {
  it('reveals all items when ellipsis button is clicked', async () => {
    const user = userEvent.setup();
    const items: BreadcrumbItem[] = [
      { label: 'Home', href: '/' },
      { label: 'A', href: '/a' },
      { label: 'B', href: '/b' },
      { label: 'C', href: '/c' },
      { label: 'D' },
    ];
    render(<Breadcrumbs items={items} maxItems={3} />);

    // Initially collapsed
    expect(screen.queryByText('A')).not.toBeInTheDocument();
    expect(screen.queryByText('B')).not.toBeInTheDocument();

    // Click ellipsis
    const ellipsis = screen.getByRole('button', { name: 'Show all breadcrumb items' });
    await user.click(ellipsis);

    // All items now visible
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();

    // Ellipsis gone
    expect(screen.queryByRole('button', { name: 'Show all breadcrumb items' })).not.toBeInTheDocument();
  });
});

// ─── Icons ──────────────────────────────────────────────────────────────────

describe('Breadcrumbs -- icons', () => {
  it('renders icons alongside labels', () => {
    const items: BreadcrumbItem[] = [
      { label: 'Home', href: '/', icon: <svg data-testid="home-icon" /> },
      { label: 'Settings', icon: <svg data-testid="settings-icon" /> },
    ];
    render(<Breadcrumbs items={items} />);
    expect(screen.getByTestId('home-icon')).toBeInTheDocument();
    expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
  });

  it('icons are aria-hidden', () => {
    const items: BreadcrumbItem[] = [
      { label: 'Home', icon: <svg data-testid="icon" /> },
    ];
    render(<Breadcrumbs items={items} />);
    const iconWrapper = screen.getByTestId('icon').parentElement;
    expect(iconWrapper).toHaveAttribute('aria-hidden', 'true');
  });
});

// ─── onClick Handler ────────────────────────────────────────────────────────

describe('Breadcrumbs -- onClick handler', () => {
  it('calls onClick when a non-last item with onClick is clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    const items: BreadcrumbItem[] = [
      { label: 'Clickable', onClick: handleClick },
      { label: 'Current' },
    ];
    render(<Breadcrumbs items={items} />);
    await user.click(screen.getByRole('button', { name: 'Clickable' }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders as button when onClick is provided without href', () => {
    const items: BreadcrumbItem[] = [
      { label: 'Clickable', onClick: vi.fn() },
      { label: 'Current' },
    ];
    render(<Breadcrumbs items={items} />);
    const btn = screen.getByRole('button', { name: 'Clickable' });
    expect(btn.tagName).toBe('BUTTON');
  });

  it('renders as link when href is provided with onClick', () => {
    const handleClick = vi.fn();
    const items: BreadcrumbItem[] = [
      { label: 'Link', href: '/test', onClick: handleClick },
      { label: 'Current' },
    ];
    render(<Breadcrumbs items={items} />);
    const link = screen.getByRole('link', { name: 'Link' });
    expect(link).toHaveAttribute('href', '/test');
  });
});

// ─── Sizes ──────────────────────────────────────────────────────────────────

describe('Breadcrumbs -- sizes', () => {
  it.each<BreadcrumbsSize>(['sm', 'md', 'lg'])(
    'renders %s size without crashing',
    (size) => {
      const items: BreadcrumbItem[] = [
        { label: 'Home', href: '/' },
        { label: 'Page' },
      ];
      const { container } = render(<Breadcrumbs items={items} size={size} />);
      expect(container.firstChild).toBeInTheDocument();
    },
  );

  it('applies sm text class for sm size', () => {
    const items: BreadcrumbItem[] = [
      { label: 'Home', href: '/' },
      { label: 'Page' },
    ];
    render(<Breadcrumbs items={items} size="sm" />);
    const current = screen.getByText('Page').closest('[aria-current="page"]');
    expect(current).toHaveClass('text-xs');
  });

  it('applies lg text class for lg size', () => {
    const items: BreadcrumbItem[] = [
      { label: 'Home', href: '/' },
      { label: 'Page' },
    ];
    render(<Breadcrumbs items={items} size="lg" />);
    const current = screen.getByText('Page').closest('[aria-current="page"]');
    expect(current).toHaveClass('text-base');
  });
});

// ─── Ref Forwarding ─────────────────────────────────────────────────────────

describe('Breadcrumbs -- ref forwarding', () => {
  it('forwards ref to the nav element', () => {
    const ref = { current: null as HTMLElement | null };
    render(<Breadcrumbs ref={ref} items={[{ label: 'Home' }]} />);
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current!.tagName).toBe('NAV');
  });
});

// ─── className Merging ──────────────────────────────────────────────────────

describe('Breadcrumbs -- className merging', () => {
  it('passes custom className to the nav element', () => {
    const { container } = render(<Breadcrumbs items={[{ label: 'Home' }]} className="my-custom" />);
    expect(container.firstChild).toHaveClass('my-custom');
  });
});

// ─── HTML Attributes ────────────────────────────────────────────────────────

describe('Breadcrumbs -- HTML attributes', () => {
  it('passes through additional HTML attributes', () => {
    render(<Breadcrumbs items={[{ label: 'Home' }]} data-testid="my-breadcrumbs" id="bc-1" />);
    const el = screen.getByTestId('my-breadcrumbs');
    expect(el).toHaveAttribute('id', 'bc-1');
  });
});

// ─── Single Item ────────────────────────────────────────────────────────────

describe('Breadcrumbs -- single item', () => {
  it('renders single item as current page with no separator', () => {
    render(<Breadcrumbs items={[{ label: 'Home' }]} />);
    const current = screen.getByText('Home').closest('[aria-current="page"]');
    expect(current).toBeInTheDocument();
    expect(screen.queryByText('/')).not.toBeInTheDocument();
  });
});
