import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TableOfContents } from './TableOfContents';
import type { TocItem } from './TableOfContents';

const items: TocItem[] = [
  { id: 'intro', label: 'Introduction', level: 1 },
  { id: 'getting-started', label: 'Getting Started', level: 2 },
  { id: 'installation', label: 'Installation', level: 3 },
  { id: 'usage', label: 'Usage', level: 2 },
  { id: 'api', label: 'API Reference', level: 1 },
];

describe('TableOfContents', () => {
  it('renders all items', () => {
    render(<TableOfContents items={items} />);
    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Getting Started')).toBeInTheDocument();
    expect(screen.getByText('Installation')).toBeInTheDocument();
    expect(screen.getByText('Usage')).toBeInTheDocument();
    expect(screen.getByText('API Reference')).toBeInTheDocument();
  });

  it('indents items by level', () => {
    render(<TableOfContents items={items} />);
    const introLink = screen.getByTestId('toc-item-intro');
    const gettingStartedLink = screen.getByTestId('toc-item-getting-started');
    const installationLink = screen.getByTestId('toc-item-installation');

    const introPadding = parseInt(introLink.style.paddingLeft, 10);
    const gsPadding = parseInt(gettingStartedLink.style.paddingLeft, 10);
    const installPadding = parseInt(installationLink.style.paddingLeft, 10);

    // Higher levels should have more indent
    expect(gsPadding).toBeGreaterThan(introPadding);
    expect(installPadding).toBeGreaterThan(gsPadding);
  });

  it('highlights active item', () => {
    render(<TableOfContents items={items} activeId="getting-started" />);
    const activeLink = screen.getByTestId('toc-item-getting-started');
    expect(activeLink.className).toContain('text-primary');
    expect(activeLink.className).toContain('border-primary');
  });

  it('does not highlight inactive items', () => {
    render(<TableOfContents items={items} activeId="getting-started" />);
    const inactiveLink = screen.getByTestId('toc-item-intro');
    expect(inactiveLink.className).toContain('text-text-secondary');
    expect(inactiveLink.className).toContain('border-transparent');
  });

  it('fires onItemClick when clicking an item', () => {
    const onItemClick = vi.fn();
    render(<TableOfContents items={items} onItemClick={onItemClick} />);
    fireEvent.click(screen.getByText('Usage'));
    expect(onItemClick).toHaveBeenCalledWith('usage');
  });

  it('renders nested children', () => {
    const nestedItems: TocItem[] = [
      {
        id: 'parent',
        label: 'Parent',
        level: 1,
        children: [
          { id: 'child-1', label: 'Child 1', level: 2 },
          { id: 'child-2', label: 'Child 2', level: 2 },
        ],
      },
    ];
    render(<TableOfContents items={nestedItems} />);
    expect(screen.getByText('Parent')).toBeInTheDocument();
    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
  });

  it('applies small size', () => {
    render(<TableOfContents items={items} size="sm" />);
    const link = screen.getByTestId('toc-item-intro');
    expect(link.className).toContain('text-xs');
  });

  it('applies large size', () => {
    render(<TableOfContents items={items} size="lg" />);
    const link = screen.getByTestId('toc-item-intro');
    expect(link.className).toContain('text-base');
  });

  it('applies className to nav element', () => {
    const { container } = render(<TableOfContents items={items} className="custom-toc" />);
    expect(container.querySelector('nav')).toHaveClass('custom-toc');
  });

  it('has aria-label on nav', () => {
    const { container } = render(<TableOfContents items={items} />);
    expect(container.querySelector('nav')).toHaveAttribute('aria-label', 'Table of contents');
  });

  it('sets aria-current on active item', () => {
    render(<TableOfContents items={items} activeId="api" />);
    const activeLink = screen.getByTestId('toc-item-api');
    expect(activeLink).toHaveAttribute('aria-current', 'location');
  });

  it('does not set aria-current on inactive items', () => {
    render(<TableOfContents items={items} activeId="api" />);
    const inactiveLink = screen.getByTestId('toc-item-intro');
    expect(inactiveLink).not.toHaveAttribute('aria-current');
  });
});
