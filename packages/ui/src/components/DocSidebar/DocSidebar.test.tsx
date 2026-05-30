import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DocSidebar } from './DocSidebar';
import type { DocSidebarSection } from './DocSidebar';

const basicSections: DocSidebarSection[] = [
  {
    title: 'Getting Started',
    items: [
      { id: 'intro', label: 'Introduction', href: '/docs/intro' },
      { id: 'install', label: 'Installation', href: '/docs/install' },
    ],
  },
  {
    title: 'API Reference',
    items: [
      {
        id: 'components',
        label: 'Components',
        children: [
          { id: 'button', label: 'Button', href: '/docs/button' },
          { id: 'input', label: 'Input', href: '/docs/input' },
        ],
      },
      { id: 'hooks', label: 'Hooks', href: '/docs/hooks' },
    ],
  },
];

describe('DocSidebar', () => {
  it('renders a nav element', () => {
    render(<DocSidebar sections={basicSections} />);
    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveAttribute('aria-label', 'Documentation sidebar');
  });

  it('renders section titles', () => {
    render(<DocSidebar sections={basicSections} />);
    expect(screen.getByText('Getting Started')).toBeInTheDocument();
    expect(screen.getByText('API Reference')).toBeInTheDocument();
  });

  it('renders items', () => {
    render(<DocSidebar sections={basicSections} />);
    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Installation')).toBeInTheDocument();
    expect(screen.getByText('Components')).toBeInTheDocument();
    expect(screen.getByText('Hooks')).toBeInTheDocument();
  });

  it('highlights the active item', () => {
    render(<DocSidebar sections={basicSections} activeId="intro" />);
    const item = screen.getByTestId('doc-sidebar-item-intro');
    expect(item).toHaveAttribute('aria-current', 'page');
    expect(item.className).toContain('border-primary');
    expect(item.className).toContain('bg-primary-subtle');
  });

  it('collapses and expands nested items', () => {
    render(<DocSidebar sections={basicSections} />);
    const componentsBtn = screen.getByTestId('doc-sidebar-item-components');

    // Initially collapsed
    expect(componentsBtn).toHaveAttribute('aria-expanded', 'false');

    // Click to expand
    fireEvent.click(componentsBtn);
    expect(componentsBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Button')).toBeInTheDocument();

    // Click again to collapse
    fireEvent.click(componentsBtn);
    expect(componentsBtn).toHaveAttribute('aria-expanded', 'false');
  });

  it('calls onNavigate when an item is clicked', () => {
    const onNavigate = vi.fn();
    render(<DocSidebar sections={basicSections} onNavigate={onNavigate} />);

    fireEvent.click(screen.getByText('Introduction'));
    expect(onNavigate).toHaveBeenCalledWith('intro');
  });

  it('calls onNavigate when a parent with children is clicked', () => {
    const onNavigate = vi.fn();
    render(<DocSidebar sections={basicSections} onNavigate={onNavigate} />);

    fireEvent.click(screen.getByText('Components'));
    expect(onNavigate).toHaveBeenCalledWith('components');
  });

  it('filters items when searching', () => {
    render(<DocSidebar sections={basicSections} showSearch />);

    const searchInput = screen.getByRole('searchbox');
    fireEvent.change(searchInput, { target: { value: 'Button' } });

    expect(screen.getByText('Button')).toBeInTheDocument();
    expect(screen.queryByText('Installation')).not.toBeInTheDocument();
    expect(screen.queryByText('Hooks')).not.toBeInTheDocument();
  });

  it('renders badges', () => {
    const sections: DocSidebarSection[] = [
      {
        items: [
          {
            id: 'new-feature',
            label: 'New Feature',
            badge: <span data-testid="badge-new">NEW</span>,
          },
        ],
      },
    ];
    render(<DocSidebar sections={sections} />);
    expect(screen.getByTestId('badge-new')).toBeInTheDocument();
    expect(screen.getByText('NEW')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<DocSidebar sections={basicSections} className="custom-class" />);
    const nav = screen.getByRole('navigation');
    expect(nav.className).toContain('custom-class');
  });

  it('uses renderLink for items with href', () => {
    const renderLink = vi.fn(({ href, children, className }) => (
      <a href={href} className={className} data-testid="custom-link">
        {children}
      </a>
    ));

    render(
      <DocSidebar sections={basicSections} renderLink={renderLink} />,
    );

    expect(renderLink).toHaveBeenCalled();
    expect(screen.getAllByTestId('custom-link').length).toBeGreaterThan(0);
  });

  it('auto-expands ancestors of the active item', () => {
    render(<DocSidebar sections={basicSections} activeId="button" />);

    // The "Components" parent should be expanded because "button" is its child
    const componentsBtn = screen.getByTestId('doc-sidebar-item-components');
    expect(componentsBtn).toHaveAttribute('aria-expanded', 'true');

    // The child should be visible
    expect(screen.getByText('Button')).toBeInTheDocument();
  });

  it('renders without section titles', () => {
    const sections: DocSidebarSection[] = [
      {
        items: [
          { id: 'item1', label: 'Item 1' },
          { id: 'item2', label: 'Item 2' },
        ],
      },
    ];
    render(<DocSidebar sections={sections} />);
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });
});
