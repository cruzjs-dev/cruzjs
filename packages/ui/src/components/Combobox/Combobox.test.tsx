import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Combobox, type ComboboxOption } from './Combobox';

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

const fruits: ComboboxOption[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'dragonfruit', label: 'Dragonfruit' },
  { value: 'elderberry', label: 'Elderberry' },
];

const groupedOptions: ComboboxOption[] = [
  { value: 'apple', label: 'Apple', group: 'Fruits' },
  { value: 'banana', label: 'Banana', group: 'Fruits' },
  { value: 'carrot', label: 'Carrot', group: 'Vegetables' },
  { value: 'broccoli', label: 'Broccoli', group: 'Vegetables' },
];

describe('Combobox', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  // ── Basic Rendering ──────────────────────────────────────────────────────

  describe('rendering', () => {
    it('renders input with placeholder', () => {
      render(<Combobox options={fruits} placeholder="Pick a fruit" />);
      expect(screen.getByPlaceholderText('Pick a fruit')).toBeInTheDocument();
    });

    it('renders label', () => {
      render(<Combobox options={fruits} label="Fruit" />);
      expect(screen.getByText('Fruit')).toBeInTheDocument();
    });

    it('renders description', () => {
      render(<Combobox options={fruits} label="Fruit" description="Choose your favorite" />);
      expect(screen.getByText('Choose your favorite')).toBeInTheDocument();
    });

    it('renders with combobox role', () => {
      render(<Combobox options={fruits} />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  // ── Dropdown open/close ──────────────────────────────────────────────────

  describe('dropdown', () => {
    it('opens dropdown on focus', async () => {
      const user = userEvent.setup();
      render(<Combobox options={fruits} placeholder="Pick" />);
      await user.click(screen.getByPlaceholderText('Pick'));
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('opens dropdown on click', async () => {
      const user = userEvent.setup();
      render(<Combobox options={fruits} placeholder="Pick" />);
      await user.click(screen.getByRole('combobox'));
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('shows all options when opened', async () => {
      const user = userEvent.setup();
      render(<Combobox options={fruits} placeholder="Pick" />);
      await user.click(screen.getByRole('combobox'));
      const listbox = screen.getByRole('listbox');
      const options = within(listbox).getAllByRole('option');
      expect(options).toHaveLength(5);
    });

    it('closes dropdown on Escape', async () => {
      const user = userEvent.setup();
      render(<Combobox options={fruits} placeholder="Pick" />);
      await user.click(screen.getByRole('combobox'));
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('closes dropdown on click outside', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <button data-testid="outside">Outside</button>
          <Combobox options={fruits} placeholder="Pick" />
        </div>,
      );
      await user.click(screen.getByRole('combobox'));
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      await user.click(screen.getByTestId('outside'));
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  // ── Filtering ────────────────────────────────────────────────────────────

  describe('filtering', () => {
    it('filters options by typing', async () => {
      const user = userEvent.setup();
      render(<Combobox options={fruits} placeholder="Pick" />);
      await user.click(screen.getByRole('combobox'));
      await user.type(screen.getByRole('combobox'), 'ban');
      const listbox = screen.getByRole('listbox');
      const opts = within(listbox).getAllByRole('option');
      expect(opts).toHaveLength(1);
      expect(opts[0]).toHaveTextContent('Banana');
    });

    it('shows no results message when no match', async () => {
      const user = userEvent.setup();
      render(<Combobox options={fruits} placeholder="Pick" noResultsMessage="Nothing here" />);
      await user.click(screen.getByRole('combobox'));
      await user.type(screen.getByRole('combobox'), 'zzz');
      expect(screen.getByText('Nothing here')).toBeInTheDocument();
    });

    it('uses default no results message', async () => {
      const user = userEvent.setup();
      render(<Combobox options={fruits} placeholder="Pick" />);
      await user.click(screen.getByRole('combobox'));
      await user.type(screen.getByRole('combobox'), 'zzz');
      expect(screen.getByText('No results found')).toBeInTheDocument();
    });
  });

  // ── Single Selection ─────────────────────────────────────────────────────

  describe('single selection', () => {
    it('selects option and calls onChange', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Combobox options={fruits} placeholder="Pick" onChange={onChange} />);
      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Cherry'));
      expect(onChange).toHaveBeenCalledWith('cherry');
    });

    it('closes dropdown after selection in single mode', async () => {
      const user = userEvent.setup();
      render(<Combobox options={fruits} placeholder="Pick" />);
      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Banana'));
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('displays selected value label in input when closed', async () => {
      const user = userEvent.setup();
      render(<Combobox options={fruits} placeholder="Pick" defaultValue="cherry" />);
      const input = screen.getByRole('combobox');
      // Input should show the label of the selected value when not focused
      expect(input).toHaveValue('Cherry');
      // When focused, input clears to allow searching
      await user.click(input);
      expect(input).toHaveValue('');
    });

    it('shows checkmark on selected option', async () => {
      const user = userEvent.setup();
      render(<Combobox options={fruits} placeholder="Pick" value="apple" />);
      await user.click(screen.getByRole('combobox'));
      const appleOption = screen.getByText('Apple').closest('[role="option"]');
      expect(appleOption).toHaveAttribute('aria-selected', 'true');
    });
  });

  // ── Multi Selection ──────────────────────────────────────────────────────

  describe('multi-select', () => {
    it('shows pills for selected values', () => {
      render(
        <Combobox options={fruits} multiple value={['apple', 'banana']} />,
      );
      expect(screen.getByText('Apple')).toBeInTheDocument();
      expect(screen.getByText('Banana')).toBeInTheDocument();
    });

    it('calls onChange with array in multi mode', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Combobox options={fruits} multiple placeholder="Pick" onChange={onChange} />);
      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Apple'));
      expect(onChange).toHaveBeenCalledWith(['apple']);
    });

    it('keeps dropdown open after selection in multi mode', async () => {
      const user = userEvent.setup();
      render(<Combobox options={fruits} multiple placeholder="Pick" />);
      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Apple'));
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('removes pill on X click', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <Combobox options={fruits} multiple value={['apple', 'banana']} onChange={onChange} />,
      );
      const removeApple = screen.getByLabelText('Remove Apple');
      await user.click(removeApple);
      expect(onChange).toHaveBeenCalledWith(['banana']);
    });

    it('toggles selection when clicking an already selected item', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Combobox options={fruits} multiple value={['apple']} onChange={onChange} />);
      await user.click(screen.getByRole('combobox'));
      const listbox = screen.getByRole('listbox');
      const appleOption = within(listbox).getByText('Apple');
      await user.click(appleOption);
      expect(onChange).toHaveBeenCalledWith([]);
    });

    it('removes last pill on Backspace when input is empty', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <Combobox options={fruits} multiple value={['apple', 'banana']} onChange={onChange} />,
      );
      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.keyboard('{Backspace}');
      expect(onChange).toHaveBeenCalledWith(['apple']);
    });
  });

  // ── Creatable ────────────────────────────────────────────────────────────

  describe('creatable', () => {
    it('shows "Create" option when no match found', async () => {
      const user = userEvent.setup();
      render(<Combobox options={fruits} creatable placeholder="Pick" />);
      await user.click(screen.getByRole('combobox'));
      await user.type(screen.getByRole('combobox'), 'Mango');
      expect(screen.getByText(/Create/)).toBeInTheDocument();
      expect(screen.getByText(/Mango/)).toBeInTheDocument();
    });

    it('does not show "Create" option when exact match exists', async () => {
      const user = userEvent.setup();
      render(<Combobox options={fruits} creatable placeholder="Pick" />);
      await user.click(screen.getByRole('combobox'));
      await user.type(screen.getByRole('combobox'), 'Apple');
      expect(screen.queryByText(/Create/)).not.toBeInTheDocument();
    });

    it('calls onChange with new value when creating', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Combobox options={fruits} creatable placeholder="Pick" onChange={onChange} />);
      await user.click(screen.getByRole('combobox'));
      await user.type(screen.getByRole('combobox'), 'Mango');
      await user.click(screen.getByText(/Create/));
      expect(onChange).toHaveBeenCalledWith('Mango');
    });
  });

  // ── Keyboard Navigation ──────────────────────────────────────────────────

  describe('keyboard navigation', () => {
    it('ArrowDown opens dropdown', async () => {
      const user = userEvent.setup();
      render(<Combobox options={fruits} placeholder="Pick" />);
      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      await user.keyboard('{ArrowDown}');
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('ArrowDown/ArrowUp navigate options', async () => {
      const user = userEvent.setup();
      render(<Combobox options={fruits} placeholder="Pick" />);
      await user.click(screen.getByRole('combobox'));
      // First ArrowDown should move to index 1 (from initial 0)
      await user.keyboard('{ArrowDown}');
      const input = screen.getByRole('combobox');
      expect(input.getAttribute('aria-activedescendant')).toContain('option-1');

      await user.keyboard('{ArrowUp}');
      expect(input.getAttribute('aria-activedescendant')).toContain('option-0');
    });

    it('Enter selects active option', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Combobox options={fruits} placeholder="Pick" onChange={onChange} />);
      await user.click(screen.getByRole('combobox'));
      await user.keyboard('{ArrowDown}'); // Move to Banana (index 1)
      await user.keyboard('{Enter}');
      expect(onChange).toHaveBeenCalledWith('banana');
    });

    it('skips disabled options during navigation', async () => {
      const user = userEvent.setup();
      const optionsWithDisabled: ComboboxOption[] = [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B', disabled: true },
        { value: 'c', label: 'C' },
      ];
      render(<Combobox options={optionsWithDisabled} placeholder="Pick" />);
      await user.click(screen.getByRole('combobox'));
      await user.keyboard('{ArrowDown}'); // Should skip B (disabled), go to C
      const input = screen.getByRole('combobox');
      expect(input.getAttribute('aria-activedescendant')).toContain('option-2');
    });
  });

  // ── maxSelections ────────────────────────────────────────────────────────

  describe('maxSelections', () => {
    it('prevents selection beyond limit', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <Combobox
          options={fruits}
          multiple
          maxSelections={2}
          value={['apple', 'banana']}
          onChange={onChange}
          placeholder="Pick"
        />,
      );
      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByText('Cherry'));
      // onChange should not be called since limit is reached
      expect(onChange).not.toHaveBeenCalled();
    });

    it('allows deselecting when at limit', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <Combobox
          options={fruits}
          multiple
          maxSelections={2}
          value={['apple', 'banana']}
          onChange={onChange}
          placeholder="Pick"
        />,
      );
      await user.click(screen.getByRole('combobox'));
      const listbox = screen.getByRole('listbox');
      // Click Apple in listbox to deselect
      await user.click(within(listbox).getByText('Apple'));
      expect(onChange).toHaveBeenCalledWith(['banana']);
    });
  });

  // ── Disabled ─────────────────────────────────────────────────────────────

  describe('disabled state', () => {
    it('disables the input', () => {
      render(<Combobox options={fruits} disabled placeholder="Pick" />);
      expect(screen.getByRole('combobox')).toBeDisabled();
    });

    it('does not open dropdown when disabled', async () => {
      const user = userEvent.setup();
      render(<Combobox options={fruits} disabled placeholder="Pick" />);
      await user.click(screen.getByRole('combobox'));
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  // ── Error Display ────────────────────────────────────────────────────────

  describe('error display', () => {
    it('renders error message', () => {
      render(<Combobox options={fruits} error="Required field" />);
      expect(screen.getByText('Required field')).toBeInTheDocument();
    });

    it('sets aria-invalid on error', () => {
      render(<Combobox options={fruits} error="Required" />);
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('connects error via aria-describedby', () => {
      render(<Combobox options={fruits} error="Required" id="test-cb" />);
      const input = screen.getByRole('combobox');
      expect(input).toHaveAttribute('aria-describedby', 'test-cb-error');
      expect(document.getElementById('test-cb-error')).toHaveTextContent('Required');
    });
  });

  // ── Groups ───────────────────────────────────────────────────────────────

  describe('groups', () => {
    it('renders group labels', async () => {
      const user = userEvent.setup();
      render(<Combobox options={groupedOptions} placeholder="Pick" />);
      await user.click(screen.getByRole('combobox'));
      expect(screen.getByText('Fruits')).toBeInTheDocument();
      expect(screen.getByText('Vegetables')).toBeInTheDocument();
    });
  });

  // ── Clearable ────────────────────────────────────────────────────────────

  describe('clearable', () => {
    it('shows clear button when value is selected', () => {
      render(<Combobox options={fruits} clearable value="apple" />);
      expect(screen.getByLabelText('Clear selection')).toBeInTheDocument();
    });

    it('clears value on clear button click', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Combobox options={fruits} clearable value="apple" onChange={onChange} />);
      await user.click(screen.getByLabelText('Clear selection'));
      expect(onChange).toHaveBeenCalledWith(undefined);
    });

    it('does not show clear button when no value', () => {
      render(<Combobox options={fruits} clearable />);
      expect(screen.queryByLabelText('Clear selection')).not.toBeInTheDocument();
    });

    it('does not show clear button when disabled', () => {
      render(<Combobox options={fruits} clearable disabled value="apple" />);
      expect(screen.queryByLabelText('Clear selection')).not.toBeInTheDocument();
    });
  });

  // ── ARIA ─────────────────────────────────────────────────────────────────

  describe('ARIA attributes', () => {
    it('has aria-haspopup=listbox', () => {
      render(<Combobox options={fruits} />);
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-haspopup', 'listbox');
    });

    it('has aria-expanded', async () => {
      const user = userEvent.setup();
      render(<Combobox options={fruits} placeholder="Pick" />);
      const input = screen.getByRole('combobox');
      expect(input).toHaveAttribute('aria-expanded', 'false');
      await user.click(input);
      expect(input).toHaveAttribute('aria-expanded', 'true');
    });

    it('has aria-autocomplete=list', () => {
      render(<Combobox options={fruits} />);
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-autocomplete', 'list');
    });

    it('sets aria-multiselectable on listbox in multi mode', async () => {
      const user = userEvent.setup();
      render(<Combobox options={fruits} multiple placeholder="Pick" />);
      await user.click(screen.getByRole('combobox'));
      expect(screen.getByRole('listbox')).toHaveAttribute('aria-multiselectable', 'true');
    });
  });

  // ── Ref Forwarding ─────────────────────────────────────────────────────

  describe('ref forwarding', () => {
    it('forwards ref to input element', () => {
      const ref = { current: null as HTMLInputElement | null };
      render(<Combobox ref={ref} options={fruits} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current?.getAttribute('role')).toBe('combobox');
    });
  });
});
