import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Tree } from './Tree';
import type { TreeNode } from './Tree';

const treeData: TreeNode[] = [
  {
    id: 'root-1',
    label: 'Documents',
    children: [
      { id: 'doc-1', label: 'Resume.pdf' },
      { id: 'doc-2', label: 'Cover Letter.docx' },
    ],
  },
  {
    id: 'root-2',
    label: 'Photos',
    children: [
      {
        id: 'photos-1',
        label: 'Vacation',
        children: [
          { id: 'photo-1', label: 'beach.jpg' },
          { id: 'photo-2', label: 'sunset.jpg' },
        ],
      },
    ],
  },
  { id: 'root-3', label: 'Notes.txt' },
];

describe('Tree', () => {
  it('renders top-level nodes', () => {
    render(<Tree data={treeData} />);
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('Photos')).toBeInTheDocument();
    expect(screen.getByText('Notes.txt')).toBeInTheDocument();
  });

  it('does not show children by default', () => {
    render(<Tree data={treeData} />);
    expect(screen.queryByText('Resume.pdf')).not.toBeInTheDocument();
  });

  it('expands children on chevron click', () => {
    render(<Tree data={treeData} />);
    const expandBtn = screen.getByText('Documents').closest('[role="treeitem"]')!.querySelector('button')!;
    fireEvent.click(expandBtn);
    expect(screen.getByText('Resume.pdf')).toBeInTheDocument();
    expect(screen.getByText('Cover Letter.docx')).toBeInTheDocument();
  });

  it('collapses children on second chevron click', () => {
    render(<Tree data={treeData} />);
    const expandBtn = screen.getByText('Documents').closest('[role="treeitem"]')!.querySelector('button')!;
    fireEvent.click(expandBtn);
    expect(screen.getByText('Resume.pdf')).toBeInTheDocument();
    fireEvent.click(expandBtn);
    expect(screen.queryByText('Resume.pdf')).not.toBeInTheDocument();
  });

  it('renders nested children when expanded', () => {
    render(<Tree data={treeData} defaultExpanded={['root-2', 'photos-1']} />);
    expect(screen.getByText('Vacation')).toBeInTheDocument();
    expect(screen.getByText('beach.jpg')).toBeInTheDocument();
    expect(screen.getByText('sunset.jpg')).toBeInTheDocument();
  });

  it('calls onSelect when clicking a node label', () => {
    const onSelect = vi.fn();
    render(<Tree data={treeData} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Notes.txt'));
    expect(onSelect).toHaveBeenCalledWith('root-3');
  });

  it('highlights selected node via selectedId', () => {
    render(<Tree data={treeData} selectedId="root-3" />);
    const selectedNode = screen.getByText('Notes.txt').closest('[data-node-id]')!;
    expect(selectedNode.className).toContain('bg-primary/10');
  });

  it('sets aria-expanded on parent nodes', () => {
    render(<Tree data={treeData} />);
    const docItem = screen.getByText('Documents').closest('[role="treeitem"]')!;
    expect(docItem).toHaveAttribute('aria-expanded', 'false');

    const expandBtn = docItem.querySelector('button')!;
    fireEvent.click(expandBtn);
    expect(docItem).toHaveAttribute('aria-expanded', 'true');
  });

  it('does not set aria-expanded on leaf nodes', () => {
    render(<Tree data={treeData} />);
    const noteItem = screen.getByText('Notes.txt').closest('[role="treeitem"]')!;
    expect(noteItem).not.toHaveAttribute('aria-expanded');
  });

  it('respects defaultExpanded', () => {
    render(<Tree data={treeData} defaultExpanded={['root-1']} />);
    expect(screen.getByText('Resume.pdf')).toBeInTheDocument();
    expect(screen.queryByText('Vacation')).not.toBeInTheDocument();
  });

  it('calls onExpand when toggling', () => {
    const onExpand = vi.fn();
    render(<Tree data={treeData} onExpand={onExpand} />);
    const expandBtn = screen.getByText('Documents').closest('[role="treeitem"]')!.querySelector('button')!;
    fireEvent.click(expandBtn);
    expect(onExpand).toHaveBeenCalledWith('root-1', true);
    fireEvent.click(expandBtn);
    expect(onExpand).toHaveBeenCalledWith('root-1', false);
  });

  it('disabled node does not trigger onSelect', () => {
    const onSelect = vi.fn();
    const dataWithDisabled: TreeNode[] = [
      { id: 'disabled-1', label: 'Disabled Node', disabled: true },
      { id: 'enabled-1', label: 'Enabled Node' },
    ];
    render(<Tree data={dataWithDisabled} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Disabled Node'));
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Enabled Node'));
    expect(onSelect).toHaveBeenCalledWith('enabled-1');
  });

  it('has role="tree" on root', () => {
    const { container } = render(<Tree data={treeData} />);
    expect(container.querySelector('[role="tree"]')).toBeInTheDocument();
  });

  it('navigates with ArrowDown key', () => {
    render(<Tree data={treeData} />);
    const docsNode = screen.getByText('Documents').closest('[data-node-id]') as HTMLElement;
    act(() => {
      docsNode.focus();
    });
    act(() => {
      fireEvent.keyDown(docsNode, { key: 'ArrowDown' });
    });
    // Focus should move to next visible node (Photos)
    expect(document.activeElement?.getAttribute('data-node-id')).toBe('root-2');
  });

  it('navigates with ArrowUp key', () => {
    render(<Tree data={treeData} />);
    const photosNode = screen.getByText('Photos').closest('[data-node-id]') as HTMLElement;
    act(() => {
      photosNode.focus();
    });
    act(() => {
      fireEvent.keyDown(photosNode, { key: 'ArrowUp' });
    });
    expect(document.activeElement?.getAttribute('data-node-id')).toBe('root-1');
  });

  it('expands with ArrowRight and collapses with ArrowLeft', () => {
    render(<Tree data={treeData} />);
    const docsNode = screen.getByText('Documents').closest('[data-node-id]')!;
    fireEvent.focus(docsNode);

    // ArrowRight expands
    fireEvent.keyDown(docsNode, { key: 'ArrowRight' });
    const docItem = screen.getByText('Documents').closest('[role="treeitem"]')!;
    expect(docItem).toHaveAttribute('aria-expanded', 'true');

    // ArrowLeft collapses
    fireEvent.keyDown(docsNode, { key: 'ArrowLeft' });
    expect(docItem).toHaveAttribute('aria-expanded', 'false');
  });

  it('selects node with Enter key', () => {
    const onSelect = vi.fn();
    render(<Tree data={treeData} onSelect={onSelect} />);
    const notesNode = screen.getByText('Notes.txt').closest('[data-node-id]')!;
    fireEvent.focus(notesNode);
    fireEvent.keyDown(notesNode, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith('root-3');
  });

  it('applies className', () => {
    const { container } = render(<Tree data={treeData} className="test-tree" />);
    expect(container.querySelector('[role="tree"]')).toHaveClass('test-tree');
  });
});
