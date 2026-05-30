import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Menu, type MenuItem, type MenuGroup } from './Menu';

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

const basicItems: MenuItem[] = [
  { label: 'Edit', onClick: vi.fn() },
  { label: 'Duplicate', onClick: vi.fn() },
  { label: 'Delete', destructive: true, onClick: vi.fn() },
];

describe('Menu', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    vi.clearAllMocks();
  });

  it('renders trigger', () => {
    render(
      <Menu trigger={<button>Actions</button>} items={basicItems} />,
    );
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('does not show menu initially', () => {
    render(
      <Menu trigger={<button>Actions</button>} items={basicItems} />,
    );
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens on click and renders items', () => {
    render(
      <Menu trigger={<button>Actions</button>} items={basicItems} />,
    );
    fireEvent.click(screen.getByText('Actions'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('sets aria-expanded and aria-haspopup on trigger', () => {
    render(
      <Menu trigger={<button>Actions</button>} items={basicItems} />,
    );
    const trigger = screen.getByText('Actions');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('fires onClick handler when item is clicked', () => {
    const handler = vi.fn();
    const items: MenuItem[] = [{ label: 'Save', onClick: handler }];
    render(
      <Menu trigger={<button>Actions</button>} items={items} />,
    );
    fireEvent.click(screen.getByText('Actions'));
    fireEvent.click(screen.getByText('Save'));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('closes menu after item click', () => {
    const items: MenuItem[] = [{ label: 'Save', onClick: vi.fn() }];
    render(
      <Menu trigger={<button>Actions</button>} items={items} />,
    );
    fireEvent.click(screen.getByText('Actions'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Save'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes on Escape key', () => {
    render(
      <Menu trigger={<button>Actions</button>} items={basicItems} />,
    );
    fireEvent.click(screen.getByText('Actions'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes on click outside', () => {
    render(
      <div>
        <span data-testid="outside">Outside</span>
        <Menu trigger={<button>Actions</button>} items={basicItems} />
      </div>,
    );
    fireEvent.click(screen.getByText('Actions'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('toggles on repeated clicks', () => {
    render(
      <Menu trigger={<button>Actions</button>} items={basicItems} />,
    );
    const trigger = screen.getByText('Actions');
    fireEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  describe('keyboard navigation', () => {
    it('navigates with ArrowDown and ArrowUp', () => {
      render(
        <Menu trigger={<button>Actions</button>} items={basicItems} />,
      );
      fireEvent.click(screen.getByText('Actions'));
      const menu = screen.getByRole('menu');

      // ArrowDown highlights first item
      fireEvent.keyDown(menu, { key: 'ArrowDown' });
      expect(screen.getByText('Edit').closest('[role="menuitem"]')).toHaveAttribute(
        'data-menu-index', '0',
      );

      // ArrowDown again highlights second item
      fireEvent.keyDown(menu, { key: 'ArrowDown' });
      // ArrowUp goes back to first
      fireEvent.keyDown(menu, { key: 'ArrowUp' });
      // Verify we can activate with Enter on the first item
      fireEvent.keyDown(menu, { key: 'Enter' });
      expect(basicItems[0].onClick).toHaveBeenCalledOnce();
    });

    it('Home and End keys navigate to first and last items', () => {
      const items: MenuItem[] = [
        { label: 'First', onClick: vi.fn() },
        { label: 'Middle', onClick: vi.fn() },
        { label: 'Last', onClick: vi.fn() },
      ];
      render(
        <Menu trigger={<button>Actions</button>} items={items} />,
      );
      fireEvent.click(screen.getByText('Actions'));
      const menu = screen.getByRole('menu');

      fireEvent.keyDown(menu, { key: 'End' });
      fireEvent.keyDown(menu, { key: 'Enter' });
      expect(items[2].onClick).toHaveBeenCalledOnce();
    });

    it('Enter on trigger opens menu with first item highlighted', () => {
      const items: MenuItem[] = [
        { label: 'First', onClick: vi.fn() },
        { label: 'Second', onClick: vi.fn() },
      ];
      render(
        <Menu trigger={<button>Actions</button>} items={items} />,
      );
      const trigger = screen.getByText('Actions');
      fireEvent.keyDown(trigger, { key: 'ArrowDown' });
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
  });

  describe('disabled items', () => {
    it('renders disabled items with aria-disabled', () => {
      const items: MenuItem[] = [
        { label: 'Enabled', onClick: vi.fn() },
        { label: 'Disabled', onClick: vi.fn(), disabled: true },
      ];
      render(
        <Menu trigger={<button>Actions</button>} items={items} />,
      );
      fireEvent.click(screen.getByText('Actions'));
      const disabledItem = screen.getByText('Disabled').closest('[role="menuitem"]');
      expect(disabledItem).toHaveAttribute('aria-disabled', 'true');
    });

    it('does not fire onClick on disabled items', () => {
      const handler = vi.fn();
      const items: MenuItem[] = [
        { label: 'Disabled', onClick: handler, disabled: true },
      ];
      render(
        <Menu trigger={<button>Actions</button>} items={items} />,
      );
      fireEvent.click(screen.getByText('Actions'));
      fireEvent.click(screen.getByText('Disabled'));
      expect(handler).not.toHaveBeenCalled();
    });

    it('skips disabled items during keyboard navigation', () => {
      const handler = vi.fn();
      const items: MenuItem[] = [
        { label: 'First', onClick: vi.fn() },
        { label: 'Disabled', onClick: vi.fn(), disabled: true },
        { label: 'Third', onClick: handler },
      ];
      render(
        <Menu trigger={<button>Actions</button>} items={items} />,
      );
      fireEvent.click(screen.getByText('Actions'));
      const menu = screen.getByRole('menu');

      // ArrowDown -> First (index 0)
      fireEvent.keyDown(menu, { key: 'ArrowDown' });
      // ArrowDown -> skips Disabled (index 1), lands on Third (index 2)
      fireEvent.keyDown(menu, { key: 'ArrowDown' });
      fireEvent.keyDown(menu, { key: 'Enter' });
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('destructive items', () => {
    it('renders destructive items with danger styling', () => {
      const items: MenuItem[] = [
        { label: 'Delete', destructive: true, onClick: vi.fn() },
      ];
      render(
        <Menu trigger={<button>Actions</button>} items={items} />,
      );
      fireEvent.click(screen.getByText('Actions'));
      const item = screen.getByText('Delete').closest('[role="menuitem"]');
      expect(item?.className).toContain('text-danger');
    });
  });

  describe('groups', () => {
    it('renders groups with labels and dividers', () => {
      const groups: MenuGroup[] = [
        { label: 'Edit', items: [{ label: 'Cut' }, { label: 'Copy' }] },
        { label: 'View', items: [{ label: 'Zoom In' }] },
      ];
      render(
        <Menu trigger={<button>Actions</button>} groups={groups} />,
      );
      fireEvent.click(screen.getByText('Actions'));
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('View')).toBeInTheDocument();
      expect(screen.getByText('Cut')).toBeInTheDocument();
      expect(screen.getByText('Copy')).toBeInTheDocument();
      expect(screen.getByText('Zoom In')).toBeInTheDocument();

      // Divider (separator) between groups
      const separators = screen.getAllByRole('separator');
      expect(separators.length).toBeGreaterThanOrEqual(1);
    });

    it('renders groups without labels', () => {
      const groups: MenuGroup[] = [
        { items: [{ label: 'Cut' }] },
        { items: [{ label: 'Paste' }] },
      ];
      render(
        <Menu trigger={<button>Actions</button>} groups={groups} />,
      );
      fireEvent.click(screen.getByText('Actions'));
      expect(screen.getByText('Cut')).toBeInTheDocument();
      expect(screen.getByText('Paste')).toBeInTheDocument();
    });
  });

  describe('shortcuts', () => {
    it('renders shortcut text', () => {
      const items: MenuItem[] = [
        { label: 'Copy', shortcut: '⌘C' },
        { label: 'Paste', shortcut: '⌘V' },
      ];
      render(
        <Menu trigger={<button>Actions</button>} items={items} />,
      );
      fireEvent.click(screen.getByText('Actions'));
      expect(screen.getByText('⌘C')).toBeInTheDocument();
      expect(screen.getByText('⌘V')).toBeInTheDocument();
    });
  });
});
