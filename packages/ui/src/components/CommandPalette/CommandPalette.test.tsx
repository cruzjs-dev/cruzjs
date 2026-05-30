import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommandPalette, type CommandPaletteItem } from './CommandPalette';

vi.mock('../../hooks/useIsMobile', () => ({
  useIsMobile: vi.fn(() => false),
}));

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

const sampleItems: CommandPaletteItem[] = [
  { id: '1', label: 'Create Project', description: 'Start a new project', onSelect: vi.fn(), group: 'Actions' },
  { id: '2', label: 'Open Settings', description: 'App settings', onSelect: vi.fn(), group: 'Actions' },
  { id: '3', label: 'Search Files', onSelect: vi.fn(), group: 'Navigation' },
  { id: '4', label: 'View Dashboard', onSelect: vi.fn(), group: 'Navigation' },
  { id: '5', label: 'Delete Account', onSelect: vi.fn(), disabled: true, group: 'Danger' },
];

function createItems(): CommandPaletteItem[] {
  return [
    { id: '1', label: 'Create Project', description: 'Start a new project', onSelect: vi.fn(), group: 'Actions' },
    { id: '2', label: 'Open Settings', description: 'App settings', onSelect: vi.fn(), group: 'Actions' },
    { id: '3', label: 'Search Files', onSelect: vi.fn(), group: 'Navigation' },
    { id: '4', label: 'View Dashboard', onSelect: vi.fn(), group: 'Navigation' },
    { id: '5', label: 'Delete Account', onSelect: vi.fn(), disabled: true, group: 'Danger' },
  ];
}

describe('CommandPalette', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  // ── Visibility ──────────────────────────────────────────────────────────

  describe('visibility', () => {
    it('renders when open', () => {
      render(<CommandPalette open onOpenChange={vi.fn()} items={sampleItems} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<CommandPalette open={false} onOpenChange={vi.fn()} items={sampleItems} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  // ── Search filtering ──────────────────────────────────────────────────

  describe('search filtering', () => {
    it('filters items based on search query', async () => {
      const user = userEvent.setup();
      render(<CommandPalette open onOpenChange={vi.fn()} items={sampleItems} />);

      const input = screen.getByLabelText('Search commands');
      await user.type(input, 'project');

      expect(screen.getByText('Create Project')).toBeInTheDocument();
      expect(screen.queryByText('Open Settings')).not.toBeInTheDocument();
      expect(screen.queryByText('Search Files')).not.toBeInTheDocument();
    });

    it('performs fuzzy matching', async () => {
      const user = userEvent.setup();
      render(<CommandPalette open onOpenChange={vi.fn()} items={sampleItems} />);

      const input = screen.getByLabelText('Search commands');
      await user.type(input, 'crpr'); // fuzzy: C-r-e-a-t-e P-r-o-j-e-c-t

      expect(screen.getByText('Create Project')).toBeInTheDocument();
    });

    it('shows empty message when no results match', async () => {
      const user = userEvent.setup();
      render(
        <CommandPalette
          open
          onOpenChange={vi.fn()}
          items={sampleItems}
          emptyMessage="Nothing found"
        />,
      );

      const input = screen.getByLabelText('Search commands');
      await user.type(input, 'zzzzzzz');

      expect(screen.getByText('Nothing found')).toBeInTheDocument();
    });

    it('shows default empty message', async () => {
      const user = userEvent.setup();
      render(<CommandPalette open onOpenChange={vi.fn()} items={sampleItems} />);

      const input = screen.getByLabelText('Search commands');
      await user.type(input, 'zzzzzzz');

      expect(screen.getByText('No results found')).toBeInTheDocument();
    });
  });

  // ── Keyboard navigation ───────────────────────────────────────────────

  describe('keyboard navigation', () => {
    it('ArrowDown moves to next item', async () => {
      const user = userEvent.setup();
      render(<CommandPalette open onOpenChange={vi.fn()} items={sampleItems} />);

      const input = screen.getByLabelText('Search commands');
      await user.click(input);
      await user.keyboard('{ArrowDown}');

      // Should move from index 0 to index 1
      const listbox = screen.getByRole('listbox');
      const options = within(listbox).getAllByRole('option');
      expect(options[1]).toHaveAttribute('aria-selected', 'true');
    });

    it('ArrowUp moves to previous item', async () => {
      const user = userEvent.setup();
      render(<CommandPalette open onOpenChange={vi.fn()} items={sampleItems} />);

      const input = screen.getByLabelText('Search commands');
      await user.click(input);
      // Move down first, then up
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowUp}');

      const listbox = screen.getByRole('listbox');
      const options = within(listbox).getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('ArrowDown wraps around to first item', async () => {
      const user = userEvent.setup();
      const items: CommandPaletteItem[] = [
        { id: '1', label: 'One', onSelect: vi.fn() },
        { id: '2', label: 'Two', onSelect: vi.fn() },
      ];
      render(<CommandPalette open onOpenChange={vi.fn()} items={items} />);

      const input = screen.getByLabelText('Search commands');
      await user.click(input);
      // Go past the last item
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');

      const listbox = screen.getByRole('listbox');
      const options = within(listbox).getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('ArrowUp wraps around to last item', async () => {
      const user = userEvent.setup();
      const items: CommandPaletteItem[] = [
        { id: '1', label: 'One', onSelect: vi.fn() },
        { id: '2', label: 'Two', onSelect: vi.fn() },
      ];
      render(<CommandPalette open onOpenChange={vi.fn()} items={items} />);

      const input = screen.getByLabelText('Search commands');
      await user.click(input);
      // ArrowUp from first item wraps to last
      await user.keyboard('{ArrowUp}');

      const listbox = screen.getByRole('listbox');
      const options = within(listbox).getAllByRole('option');
      expect(options[1]).toHaveAttribute('aria-selected', 'true');
    });

    it('Enter triggers onSelect for active item', async () => {
      const user = userEvent.setup();
      const items = createItems();
      const onOpenChange = vi.fn();
      render(<CommandPalette open onOpenChange={onOpenChange} items={items} />);

      const input = screen.getByLabelText('Search commands');
      await user.click(input);
      await user.keyboard('{Enter}');

      expect(items[0].onSelect).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('Escape closes the palette', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<CommandPalette open onOpenChange={onOpenChange} items={sampleItems} />);

      const input = screen.getByLabelText('Search commands');
      await user.click(input);
      await user.keyboard('{Escape}');

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('skips disabled items when navigating', async () => {
      const user = userEvent.setup();
      const items: CommandPaletteItem[] = [
        { id: '1', label: 'One', onSelect: vi.fn() },
        { id: '2', label: 'Two', onSelect: vi.fn(), disabled: true },
        { id: '3', label: 'Three', onSelect: vi.fn() },
      ];
      render(<CommandPalette open onOpenChange={vi.fn()} items={items} />);

      const input = screen.getByLabelText('Search commands');
      await user.click(input);
      // ArrowDown from index 0 should skip disabled index 1 and go to index 2
      await user.keyboard('{ArrowDown}');

      const listbox = screen.getByRole('listbox');
      const options = within(listbox).getAllByRole('option');
      expect(options[2]).toHaveAttribute('aria-selected', 'true');
    });
  });

  // ── Disabled items ────────────────────────────────────────────────────

  describe('disabled items', () => {
    it('does not trigger onSelect for disabled items', async () => {
      const user = userEvent.setup();
      const disabledItem: CommandPaletteItem = {
        id: 'disabled',
        label: 'Disabled Action',
        onSelect: vi.fn(),
        disabled: true,
      };
      render(
        <CommandPalette open onOpenChange={vi.fn()} items={[disabledItem]} />,
      );

      const option = screen.getByRole('option');
      await user.click(option);

      expect(disabledItem.onSelect).not.toHaveBeenCalled();
    });

    it('renders disabled items with aria-disabled', () => {
      const disabledItem: CommandPaletteItem = {
        id: 'disabled',
        label: 'Disabled Action',
        onSelect: vi.fn(),
        disabled: true,
      };
      render(
        <CommandPalette open onOpenChange={vi.fn()} items={[disabledItem]} />,
      );

      expect(screen.getByRole('option')).toHaveAttribute('aria-disabled', 'true');
    });
  });

  // ── Group labels ──────────────────────────────────────────────────────

  describe('group labels', () => {
    it('renders group labels', () => {
      render(<CommandPalette open onOpenChange={vi.fn()} items={sampleItems} />);

      expect(screen.getByText('Actions')).toBeInTheDocument();
      expect(screen.getByText('Navigation')).toBeInTheDocument();
      expect(screen.getByText('Danger')).toBeInTheDocument();
    });

    it('groups items under correct labels', () => {
      render(<CommandPalette open onOpenChange={vi.fn()} items={sampleItems} />);

      const groups = screen.getAllByRole('group');
      expect(groups).toHaveLength(3);

      // Actions group should have 2 items
      const actionsGroup = groups[0];
      expect(within(actionsGroup).getAllByRole('option')).toHaveLength(2);
    });
  });

  // ── onOpenChange ──────────────────────────────────────────────────────

  describe('onOpenChange', () => {
    it('calls onOpenChange(false) on Escape', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<CommandPalette open onOpenChange={onOpenChange} items={sampleItems} />);

      await user.keyboard('{Escape}');

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('calls onOpenChange(false) on backdrop click', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      const { container } = render(
        <CommandPalette open onOpenChange={onOpenChange} items={sampleItems} />,
      );

      // Click the outermost wrapper (backdrop area)
      const root = container.querySelector('[data-command-palette-root]') as HTMLElement;
      await user.click(root);

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  // ── Shortcut hints ────────────────────────────────────────────────────

  describe('shortcut hints', () => {
    it('renders keyboard shortcut hints', () => {
      const items: CommandPaletteItem[] = [
        { id: '1', label: 'New File', shortcut: ['Ctrl', 'N'], onSelect: vi.fn() },
      ];
      render(<CommandPalette open onOpenChange={vi.fn()} items={items} />);

      expect(screen.getByText('Ctrl')).toBeInTheDocument();
      expect(screen.getByText('N')).toBeInTheDocument();
    });
  });

  // ── Placeholder ───────────────────────────────────────────────────────

  describe('placeholder', () => {
    it('uses custom placeholder', () => {
      render(
        <CommandPalette
          open
          onOpenChange={vi.fn()}
          items={sampleItems}
          placeholder="Search actions..."
        />,
      );

      expect(screen.getByPlaceholderText('Search actions...')).toBeInTheDocument();
    });

    it('uses default placeholder', () => {
      render(<CommandPalette open onOpenChange={vi.fn()} items={sampleItems} />);
      expect(screen.getByPlaceholderText('Type a command...')).toBeInTheDocument();
    });
  });

  // ── Footer ────────────────────────────────────────────────────────────

  describe('footer', () => {
    it('renders footer content', () => {
      render(
        <CommandPalette
          open
          onOpenChange={vi.fn()}
          items={sampleItems}
          footer={<span>Press Enter to select</span>}
        />,
      );

      expect(screen.getByText('Press Enter to select')).toBeInTheDocument();
    });
  });
});
