import React, { createContext, forwardRef, useCallback, useContext, useMemo, useState } from 'react';

export type TreeNode = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  children?: TreeNode[];
  disabled?: boolean;
};

export type TreeSize = 'sm' | 'md' | 'lg';

export type TreeProps = {
  data: TreeNode[];
  defaultExpanded?: string[];
  onSelect?: (id: string) => void;
  onExpand?: (id: string, expanded: boolean) => void;
  selectedId?: string;
  size?: TreeSize;
  className?: string;
};

type TreeContextValue = {
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  selectedId?: string;
  onSelect?: (id: string) => void;
  size: TreeSize;
  focusedId: string | null;
  setFocusedId: (id: string | null) => void;
  flatNodes: string[];
};

const TreeContext = createContext<TreeContextValue | null>(null);

function useTreeContext(): TreeContextValue {
  const ctx = useContext(TreeContext);
  if (!ctx) {
    throw new Error('TreeNode components must be used inside <Tree>');
  }
  return ctx;
}

const sizeClasses: Record<TreeSize, { text: string; padding: string; indent: string; icon: string }> = {
  sm: { text: 'text-xs', padding: 'py-1 px-2', indent: 'pl-4', icon: 'w-3 h-3' },
  md: { text: 'text-sm', padding: 'py-1.5 px-2', indent: 'pl-5', icon: 'w-4 h-4' },
  lg: { text: 'text-base', padding: 'py-2 px-3', indent: 'pl-6', icon: 'w-5 h-5' },
};

const ChevronIcon: React.FC<{ expanded: boolean; className?: string }> = ({ expanded, className }) => (
  <svg
    className={className}
    style={{
      transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
      transition: 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
    }}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

function flattenVisibleNodes(nodes: TreeNode[], expandedIds: Set<string>): string[] {
  const result: string[] = [];
  function walk(items: TreeNode[]) {
    for (const node of items) {
      result.push(node.id);
      if (node.children?.length && expandedIds.has(node.id)) {
        walk(node.children);
      }
    }
  }
  walk(nodes);
  return result;
}

function findNodeById(nodes: TreeNode[], id: string): TreeNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

function findParentId(nodes: TreeNode[], targetId: string, parentId: string | null = null): string | null {
  for (const node of nodes) {
    if (node.id === targetId) {
      return parentId;
    }
    if (node.children) {
      const found = findParentId(node.children, targetId, node.id);
      if (found !== null) {
        return found;
      }
    }
  }
  return null;
}

type TreeNodeItemProps = {
  node: TreeNode;
  level: number;
};

const TreeNodeItem: React.FC<TreeNodeItemProps> = ({ node, level }) => {
  const { expandedIds, toggleExpanded, selectedId, onSelect, size, focusedId, setFocusedId, flatNodes } =
    useTreeContext();

  const styles = sizeClasses[size];
  const hasChildren = Boolean(node.children?.length);
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const isFocused = focusedId === node.id;

  const handleSelect = useCallback(() => {
    if (node.disabled) {
      return;
    }
    onSelect?.(node.id);
  }, [node.disabled, node.id, onSelect]);

  const handleChevronClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (node.disabled) {
        return;
      }
      toggleExpanded(node.id);
    },
    [node.disabled, node.id, toggleExpanded],
  );

  return (
    <li role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined} aria-selected={isSelected} aria-disabled={node.disabled || undefined}>
      <div
        data-node-id={node.id}
        tabIndex={isFocused ? 0 : -1}
        onClick={handleSelect}
        onFocus={() => setFocusedId(node.id)}
        onKeyDown={(e) => {
          if (node.disabled && (e.key === 'Enter' || e.key === ' ')) {
            return;
          }

          const currentIndex = flatNodes.indexOf(node.id);

          if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (currentIndex < flatNodes.length - 1) {
              setFocusedId(flatNodes[currentIndex + 1]);
            }
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (currentIndex > 0) {
              setFocusedId(flatNodes[currentIndex - 1]);
            }
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            if (hasChildren && !isExpanded) {
              toggleExpanded(node.id);
            } else if (hasChildren && isExpanded && node.children?.length) {
              setFocusedId(node.children[0].id);
            }
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            if (hasChildren && isExpanded) {
              toggleExpanded(node.id);
            }
          } else if (e.key === 'Enter') {
            e.preventDefault();
            handleSelect();
          }
        }}
        className={[
          'flex items-center gap-1.5 rounded-lg cursor-pointer select-none',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          styles.text,
          styles.padding,
          isSelected ? 'bg-primary/10 text-text-strong' : 'text-text-secondary hover:text-text-strong hover:bg-surface-lighter/50',
          node.disabled ? 'opacity-50 cursor-not-allowed' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ paddingLeft: `${level * (size === 'sm' ? 16 : size === 'md' ? 20 : 24)}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={handleChevronClick}
            tabIndex={-1}
            className="shrink-0 p-0.5 rounded hover:bg-surface-border/50 text-text-tertiary"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <ChevronIcon expanded={isExpanded} className={styles.icon} />
          </button>
        ) : (
          <span className={['shrink-0', styles.icon].join(' ')} />
        )}
        {node.icon && <span className="shrink-0 flex items-center">{node.icon}</span>}
        <span className="flex-1 min-w-0 truncate">{node.label}</span>
      </div>
      {hasChildren && isExpanded && (
        <ul role="group">
          {node.children!.map((child) => (
            <TreeNodeItem key={child.id} node={child} level={level + 1} />
          ))}
        </ul>
      )}
    </li>
  );
};

export const Tree = forwardRef<HTMLUListElement, TreeProps>(function Tree(
  { data, defaultExpanded = [], onSelect, onExpand, selectedId, size = 'md', className },
  ref,
) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(defaultExpanded));
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const flatNodes = useMemo(() => flattenVisibleNodes(data, expandedIds), [data, expandedIds]);

  const toggleExpanded = useCallback(
    (id: string) => {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        const willExpand = !next.has(id);
        if (willExpand) {
          next.add(id);
        } else {
          next.delete(id);
        }
        onExpand?.(id, willExpand);
        return next;
      });
    },
    [onExpand],
  );

  const handleSetFocusedId = useCallback(
    (id: string | null) => {
      setFocusedId(id);
      if (id) {
        const el = document.querySelector(`[data-node-id="${id}"]`) as HTMLElement | null;
        el?.focus();
      }
    },
    [],
  );

  const contextValue = useMemo<TreeContextValue>(
    () => ({
      expandedIds,
      toggleExpanded,
      selectedId,
      onSelect,
      size,
      focusedId,
      setFocusedId: handleSetFocusedId,
      flatNodes,
    }),
    [expandedIds, toggleExpanded, selectedId, onSelect, size, focusedId, handleSetFocusedId, flatNodes],
  );

  return (
    <TreeContext.Provider value={contextValue}>
      <ul ref={ref} role="tree" className={className}>
        {data.map((node) => (
          <TreeNodeItem key={node.id} node={node} level={0} />
        ))}
      </ul>
    </TreeContext.Provider>
  );
});

Tree.displayName = 'Tree';
