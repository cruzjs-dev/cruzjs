import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Combobox, type ComboboxOption } from './Combobox';

const fruits: ComboboxOption[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'dragonfruit', label: 'Dragonfruit' },
  { value: 'elderberry', label: 'Elderberry' },
  { value: 'fig', label: 'Fig' },
  { value: 'grape', label: 'Grape' },
  { value: 'honeydew', label: 'Honeydew' },
];

const groupedOptions: ComboboxOption[] = [
  { value: 'apple', label: 'Apple', group: 'Fruits' },
  { value: 'banana', label: 'Banana', group: 'Fruits' },
  { value: 'cherry', label: 'Cherry', group: 'Fruits' },
  { value: 'carrot', label: 'Carrot', group: 'Vegetables' },
  { value: 'broccoli', label: 'Broccoli', group: 'Vegetables' },
  { value: 'spinach', label: 'Spinach', group: 'Vegetables' },
  { value: 'basil', label: 'Basil', group: 'Herbs' },
  { value: 'cilantro', label: 'Cilantro', group: 'Herbs' },
  { value: 'rosemary', label: 'Rosemary', group: 'Herbs' },
];

const meta = {
  title: 'Forms/Combobox',
  component: Combobox,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Searchable select with filtering, multi-select via pills, creatable mode, and mobile bottom sheet.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    multiple: { control: 'boolean' },
    creatable: { control: 'boolean' },
    clearable: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    options: fruits,
    label: 'Fruit',
    placeholder: 'Search fruits...',
    clearable: true,
  },
  render: function DefaultRender(args) {
    const [value, setValue] = useState<string | string[] | undefined>();
    return (
      <div className="max-w-sm">
        <Combobox
          {...args}
          value={value as string | undefined}
          onChange={(v) => setValue(v)}
        />
        <p className="mt-3 text-xs text-text-tertiary">
          Selected: {value ?? 'none'}
        </p>
      </div>
    );
  },
};

export const MultiSelect: Story = {
  args: {
    options: fruits,
    label: 'Favorite Fruits',
    placeholder: 'Pick fruits...',
    multiple: true,
    clearable: true,
  },
  render: function MultiSelectRender(args) {
    const [value, setValue] = useState<string | string[] | undefined>([]);
    return (
      <div className="max-w-md">
        <Combobox
          {...args}
          value={value as string[]}
          onChange={(v) => setValue(v)}
        />
        <p className="mt-3 text-xs text-text-tertiary">
          Selected: {Array.isArray(value) && value.length > 0 ? value.join(', ') : 'none'}
        </p>
      </div>
    );
  },
};

export const Creatable: Story = {
  args: {
    options: fruits,
    label: 'Tags',
    placeholder: 'Type to search or create...',
    creatable: true,
    multiple: true,
    clearable: true,
  },
  render: function CreatableRender(args) {
    const [opts, setOpts] = useState(fruits);
    const [value, setValue] = useState<string[]>([]);
    return (
      <div className="max-w-md">
        <Combobox
          {...args}
          options={opts}
          value={value}
          onChange={(v) => {
            const next = v as string[];
            // Add new options for created values
            for (const val of next) {
              if (!opts.some((o) => o.value === val)) {
                setOpts((prev) => [...prev, { value: val, label: val }]);
              }
            }
            setValue(next);
          }}
        />
        <p className="mt-3 text-xs text-text-tertiary">
          Selected: {value.length > 0 ? value.join(', ') : 'none'}
        </p>
      </div>
    );
  },
};

export const WithGroups: Story = {
  args: {
    options: groupedOptions,
    label: 'Ingredient',
    placeholder: 'Search ingredients...',
    clearable: true,
  },
  render: function WithGroupsRender(args) {
    const [value, setValue] = useState<string | string[] | undefined>();
    return (
      <div className="max-w-sm">
        <Combobox
          {...args}
          value={value as string | undefined}
          onChange={(v) => setValue(v)}
        />
      </div>
    );
  },
};

export const WithError: Story = {
  args: {
    options: fruits,
    label: 'Required Fruit',
    placeholder: 'Select a fruit...',
    error: 'Please select at least one fruit',
  },
  render: (args) => (
    <div className="max-w-sm">
      <Combobox {...args} />
    </div>
  ),
};

export const MaxSelections: Story = {
  args: {
    options: fruits,
    label: 'Top 3 Fruits',
    description: 'Select up to 3 fruits',
    placeholder: 'Pick up to 3...',
    multiple: true,
    maxSelections: 3,
    clearable: true,
  },
  render: function MaxSelectionsRender(args) {
    const [value, setValue] = useState<string[]>([]);
    return (
      <div className="max-w-md">
        <Combobox
          {...args}
          value={value}
          onChange={(v) => setValue(v as string[])}
        />
        <p className="mt-3 text-xs text-text-tertiary">
          {value.length}/{args.maxSelections} selected
        </p>
      </div>
    );
  },
};

export const Disabled: Story = {
  args: {
    options: fruits,
    label: 'Disabled Combobox',
    placeholder: 'Cannot interact',
    disabled: true,
    value: 'apple',
  },
  render: (args) => (
    <div className="max-w-sm">
      <Combobox {...args} />
    </div>
  ),
};

export const Sizes: Story = {
  render: function SizesRender() {
    const [small, setSmall] = useState<string | string[] | undefined>();
    const [medium, setMedium] = useState<string | string[] | undefined>();
    const [large, setLarge] = useState<string | string[] | undefined>();
    return (
      <div className="space-y-6 max-w-sm">
        <Combobox
          size="sm"
          options={fruits}
          label="Small"
          placeholder="Small combobox"
          clearable
          value={small as string | undefined}
          onChange={(v) => setSmall(v)}
        />
        <Combobox
          size="md"
          options={fruits}
          label="Medium"
          placeholder="Medium combobox"
          clearable
          value={medium as string | undefined}
          onChange={(v) => setMedium(v)}
        />
        <Combobox
          size="lg"
          options={fruits}
          label="Large"
          placeholder="Large combobox"
          clearable
          value={large as string | undefined}
          onChange={(v) => setLarge(v)}
        />
      </div>
    );
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  render: function MobileRender() {
    const [value, setValue] = useState<string | string[] | undefined>();
    const [multi, setMulti] = useState<string[]>([]);
    return (
      <div className="p-4 space-y-6">
        <Combobox
          options={fruits}
          label="Single Select"
          placeholder="Search fruits..."
          clearable
          value={value as string | undefined}
          onChange={(v) => setValue(v)}
        />
        <Combobox
          options={groupedOptions}
          label="Multi Select with Groups"
          placeholder="Pick ingredients..."
          multiple
          clearable
          value={multi}
          onChange={(v) => setMulti(v as string[])}
        />
      </div>
    );
  },
};
