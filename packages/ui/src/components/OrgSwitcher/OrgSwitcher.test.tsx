import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrgSwitcher, type OrgSwitcherItem } from './OrgSwitcher';

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

const defaultItems: OrgSwitcherItem[] = [
  { id: 'org-1', name: 'Acme Corp' },
  { id: 'org-2', name: 'Globex Inc' },
  { id: 'org-3', name: 'Initech' },
];

describe('OrgSwitcher', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    vi.clearAllMocks();
  });

  it('renders trigger with active org name', () => {
    render(
      <OrgSwitcher items={defaultItems} activeId="org-1" onChange={vi.fn()} />,
    );
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
  });

  it('opens dropdown on click', () => {
    render(
      <OrgSwitcher items={defaultItems} activeId="org-1" onChange={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('shows all items in dropdown', () => {
    render(
      <OrgSwitcher items={defaultItems} activeId="org-1" onChange={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('option', { name: /Acme Corp/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Globex Inc/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Initech/i })).toBeInTheDocument();
  });

  it('highlights active item', () => {
    render(
      <OrgSwitcher items={defaultItems} activeId="org-1" onChange={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button'));
    const activeOption = screen.getByRole('option', { name: /Acme Corp/i });
    expect(activeOption).toHaveAttribute('aria-selected', 'true');
    expect(activeOption.className).toContain('bg-primary-subtle');
  });

  it('calls onChange on item click', () => {
    const onChange = vi.fn();
    render(
      <OrgSwitcher items={defaultItems} activeId="org-1" onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('option', { name: /Globex Inc/i }));
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith('org-2');
  });

  it('closes after selection', () => {
    const onChange = vi.fn();
    render(
      <OrgSwitcher items={defaultItems} activeId="org-1" onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: /Globex Inc/i }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes on Escape', () => {
    render(
      <OrgSwitcher items={defaultItems} activeId="org-1" onChange={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('filters items when searchable', () => {
    render(
      <OrgSwitcher
        items={defaultItems}
        activeId="org-1"
        onChange={vi.fn()}
        searchable
      />,
    );
    fireEvent.click(screen.getByRole('button'));
    const searchInput = screen.getByPlaceholderText('Search...');
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'glob' } });
    expect(screen.getByRole('option', { name: /Globex Inc/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Acme Corp/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Initech/i })).not.toBeInTheDocument();
  });

  it('shows create button when onCreateNew provided', () => {
    render(
      <OrgSwitcher
        items={defaultItems}
        activeId="org-1"
        onChange={vi.fn()}
        onCreateNew={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Create new')).toBeInTheDocument();
  });

  it('calls onCreateNew on create click', () => {
    const onCreateNew = vi.fn();
    render(
      <OrgSwitcher
        items={defaultItems}
        activeId="org-1"
        onChange={vi.fn()}
        onCreateNew={onCreateNew}
        createLabel="New workspace"
      />,
    );
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('New workspace'));
    expect(onCreateNew).toHaveBeenCalledOnce();
  });
});
