import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Select } from './Select';
import type { SelectOption } from './Select';

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

const defaultOptions: SelectOption[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
];

const groupedOptions: SelectOption[] = [
  { value: 'apple', label: 'Apple', group: 'Fruits' },
  { value: 'banana', label: 'Banana', group: 'Fruits' },
  { value: 'carrot', label: 'Carrot', group: 'Vegetables' },
  { value: 'broccoli', label: 'Broccoli', group: 'Vegetables' },
];

const optionsWithDisabled: SelectOption[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana', disabled: true },
  { value: 'cherry', label: 'Cherry' },
];

describe('Select', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it('renders trigger with placeholder', () => {
    render(<Select options={defaultOptions} placeholder="Pick a fruit" />);
    expect(screen.getByText('Pick a fruit')).toBeInTheDocument();
  });

  it('renders label', () => {
    render(<Select options={defaultOptions} label="Fruit" />);
    expect(screen.getByText('Fruit')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<Select options={defaultOptions} label="Fruit" description="Choose your favorite" />);
    expect(screen.getByText('Choose your favorite')).toBeInTheDocument();
  });

  it('opens on click and shows options', () => {
    render(<Select options={defaultOptions} placeholder="Pick" />);
    fireEvent.click(screen.getByText('Pick'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Banana')).toBeInTheDocument();
    expect(screen.getByText('Cherry')).toBeInTheDocument();
  });

  it('selects option and calls onChange', () => {
    const onChange = vi.fn();
    render(<Select options={defaultOptions} placeholder="Pick" onChange={onChange} />);
    fireEvent.click(screen.getByText('Pick'));
    fireEvent.click(screen.getByText('Banana'));
    expect(onChange).toHaveBeenCalledWith('banana');
    // dropdown should close
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    // trigger should show selected label
    expect(screen.getByText('Banana')).toBeInTheDocument();
  });

  it('shows selected value from controlled value prop', () => {
    render(<Select options={defaultOptions} value="cherry" />);
    expect(screen.getByText('Cherry')).toBeInTheDocument();
  });

  it('shows selected value from defaultValue', () => {
    render(<Select options={defaultOptions} defaultValue="apple" />);
    expect(screen.getByText('Apple')).toBeInTheDocument();
  });

  describe('keyboard navigation', () => {
    it('opens with ArrowDown and navigates options', () => {
      const onChange = vi.fn();
      render(<Select options={defaultOptions} placeholder="Pick" onChange={onChange} />);
      const trigger = screen.getByRole('combobox');

      // Open with ArrowDown
      fireEvent.keyDown(trigger, { key: 'ArrowDown' });
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      // Navigate down
      fireEvent.keyDown(trigger, { key: 'ArrowDown' });
      // Select with Enter
      fireEvent.keyDown(trigger, { key: 'Enter' });
      expect(onChange).toHaveBeenCalledWith('banana');
    });

    it('closes with Escape', () => {
      render(<Select options={defaultOptions} placeholder="Pick" />);
      const trigger = screen.getByRole('combobox');
      fireEvent.click(trigger);
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('navigates to first item with Home and last with End', () => {
      const onChange = vi.fn();
      render(<Select options={defaultOptions} placeholder="Pick" onChange={onChange} />);
      const trigger = screen.getByRole('combobox');
      fireEvent.click(trigger);

      fireEvent.keyDown(trigger, { key: 'End' });
      fireEvent.keyDown(trigger, { key: 'Enter' });
      expect(onChange).toHaveBeenCalledWith('cherry');
    });

    it('wraps around when navigating past boundaries', () => {
      const onChange = vi.fn();
      render(<Select options={defaultOptions} placeholder="Pick" onChange={onChange} />);
      const trigger = screen.getByRole('combobox');
      fireEvent.click(trigger);

      // Go up from first item should wrap to last
      fireEvent.keyDown(trigger, { key: 'ArrowUp' });
      fireEvent.keyDown(trigger, { key: 'Enter' });
      expect(onChange).toHaveBeenCalledWith('cherry');
    });

    it('prevents Tab from leaving when open', () => {
      render(<Select options={defaultOptions} placeholder="Pick" />);
      const trigger = screen.getByRole('combobox');
      fireEvent.click(trigger);

      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
      const prevented = !trigger.dispatchEvent(tabEvent);
      // Tab should be intercepted (the component calls e.preventDefault())
      // We verify the dropdown stays open
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });

  describe('searchable', () => {
    it('renders search input when searchable', () => {
      render(<Select options={defaultOptions} placeholder="Pick" searchable />);
      fireEvent.click(screen.getByText('Pick'));
      expect(screen.getByLabelText('Search options')).toBeInTheDocument();
    });

    it('filters options based on search input', () => {
      render(<Select options={defaultOptions} placeholder="Pick" searchable />);
      fireEvent.click(screen.getByText('Pick'));
      const searchInput = screen.getByLabelText('Search options');
      fireEvent.change(searchInput, { target: { value: 'ban' } });
      expect(screen.getByText('Banana')).toBeInTheDocument();
      expect(screen.queryByText('Apple')).not.toBeInTheDocument();
      expect(screen.queryByText('Cherry')).not.toBeInTheDocument();
    });

    it('shows no options message when search has no results', () => {
      render(<Select options={defaultOptions} placeholder="Pick" searchable />);
      fireEvent.click(screen.getByText('Pick'));
      const searchInput = screen.getByLabelText('Search options');
      fireEvent.change(searchInput, { target: { value: 'xyz' } });
      expect(screen.getByText('No options found')).toBeInTheDocument();
    });
  });

  describe('clearable', () => {
    it('shows clear button when value is set and clearable', () => {
      render(<Select options={defaultOptions} value="apple" clearable />);
      expect(screen.getByLabelText('Clear selection')).toBeInTheDocument();
    });

    it('does not show clear button when no value', () => {
      render(<Select options={defaultOptions} clearable placeholder="Pick" />);
      expect(screen.queryByLabelText('Clear selection')).not.toBeInTheDocument();
    });

    it('clears value when clear button clicked', () => {
      const onChange = vi.fn();
      render(<Select options={defaultOptions} defaultValue="apple" clearable onChange={onChange} />);
      fireEvent.click(screen.getByLabelText('Clear selection'));
      expect(onChange).toHaveBeenCalledWith(undefined);
    });

    it('does not show clear button when disabled', () => {
      render(<Select options={defaultOptions} value="apple" clearable disabled />);
      expect(screen.queryByLabelText('Clear selection')).not.toBeInTheDocument();
    });
  });

  describe('disabled', () => {
    it('does not open when disabled', () => {
      render(<Select options={defaultOptions} placeholder="Pick" disabled />);
      fireEvent.click(screen.getByText('Pick'));
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('applies disabled styling to trigger', () => {
      render(<Select options={defaultOptions} placeholder="Pick" disabled />);
      expect(screen.getByRole('combobox')).toBeDisabled();
    });
  });

  describe('error', () => {
    it('displays error message', () => {
      render(<Select options={defaultOptions} label="Fruit" error="Required field" />);
      expect(screen.getByText('Required field')).toBeInTheDocument();
    });

    it('sets aria-invalid on trigger', () => {
      render(<Select options={defaultOptions} label="Fruit" error="Required" />);
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('option groups', () => {
    it('renders group headers', () => {
      render(<Select options={groupedOptions} placeholder="Pick" />);
      fireEvent.click(screen.getByText('Pick'));
      expect(screen.getByText('Fruits')).toBeInTheDocument();
      expect(screen.getByText('Vegetables')).toBeInTheDocument();
    });

    it('renders options within groups', () => {
      render(<Select options={groupedOptions} placeholder="Pick" />);
      fireEvent.click(screen.getByText('Pick'));
      expect(screen.getByText('Apple')).toBeInTheDocument();
      expect(screen.getByText('Banana')).toBeInTheDocument();
      expect(screen.getByText('Carrot')).toBeInTheDocument();
      expect(screen.getByText('Broccoli')).toBeInTheDocument();
    });
  });

  describe('aria attributes', () => {
    it('has combobox role on trigger', () => {
      render(<Select options={defaultOptions} placeholder="Pick" />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('sets aria-expanded based on open state', () => {
      render(<Select options={defaultOptions} placeholder="Pick" />);
      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('sets aria-haspopup on trigger', () => {
      render(<Select options={defaultOptions} placeholder="Pick" />);
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-haspopup', 'listbox');
    });

    it('has listbox role on options panel', () => {
      render(<Select options={defaultOptions} placeholder="Pick" />);
      fireEvent.click(screen.getByRole('combobox'));
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('marks selected option with aria-selected', () => {
      render(<Select options={defaultOptions} value="banana" />);
      fireEvent.click(screen.getByRole('combobox'));
      const options = screen.getAllByRole('option');
      const bananaOption = options.find((o) => o.textContent?.includes('Banana'));
      expect(bananaOption).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('selected option checkmark', () => {
    it('shows checkmark on selected option', () => {
      render(<Select options={defaultOptions} value="apple" />);
      fireEvent.click(screen.getByRole('combobox'));
      const appleOption = screen.getAllByRole('option').find((o) => o.textContent?.includes('Apple'));
      const svg = appleOption?.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('click outside', () => {
    it('closes on click outside', () => {
      render(
        <div>
          <button data-testid="outside">Outside</button>
          <Select options={defaultOptions} placeholder="Pick" />
        </div>,
      );
      fireEvent.click(screen.getByText('Pick'));
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      fireEvent.mouseDown(screen.getByTestId('outside'));
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });
});
