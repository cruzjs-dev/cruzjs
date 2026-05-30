import type { Meta, StoryObj } from '@storybook/react';
import { PropertyPanel } from './PropertyPanel';

const meta = {
  title: 'Layout/PropertyPanel',
  component: PropertyPanel,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Side panel for editing properties of a selected item. Supports collapsible sections, header with icon, and a sticky footer slot.',
      },
    },
  },
  argTypes: {
    position: { control: 'select', options: ['left', 'right'] },
    width: { control: 'number' },
  },
} satisfies Meta<typeof PropertyPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const InputField: React.FC<{ label: string; placeholder?: string; defaultValue?: string }> = ({
  label,
  placeholder,
  defaultValue,
}) => (
  <div className="mb-3">
    <label className="block text-xs font-medium text-text-secondary mb-1">{label}</label>
    <input
      type="text"
      placeholder={placeholder}
      defaultValue={defaultValue}
      className="w-full rounded-lg border border-surface-border bg-surface-lighter px-3 py-1.5 text-sm text-text outline-none focus:ring-2 focus:ring-primary/40"
    />
  </div>
);

const SelectField: React.FC<{ label: string; options: string[] }> = ({ label, options }) => (
  <div className="mb-3">
    <label className="block text-xs font-medium text-text-secondary mb-1">{label}</label>
    <select className="w-full rounded-lg border border-surface-border bg-surface-lighter px-3 py-1.5 text-sm text-text outline-none focus:ring-2 focus:ring-primary/40">
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  </div>
);

const ToggleField: React.FC<{ label: string; defaultChecked?: boolean }> = ({
  label,
  defaultChecked,
}) => (
  <div className="flex items-center justify-between mb-3">
    <span className="text-sm text-text-secondary">{label}</span>
    <input type="checkbox" defaultChecked={defaultChecked} className="rounded" />
  </div>
);

const defaultSections = [
  {
    title: 'General',
    children: (
      <>
        <InputField label="Name" defaultValue="Dashboard Widget" />
        <InputField label="Description" placeholder="Enter a description..." />
      </>
    ),
  },
  {
    title: 'Appearance',
    children: (
      <>
        <SelectField label="Color" options={['Blue', 'Green', 'Red', 'Purple']} />
        <SelectField label="Size" options={['Small', 'Medium', 'Large']} />
      </>
    ),
  },
  {
    title: 'Advanced',
    children: (
      <>
        <ToggleField label="Visible" defaultChecked />
        <ToggleField label="Locked" />
        <ToggleField label="Cache results" defaultChecked />
      </>
    ),
  },
];

/* ------------------------------------------------------------------ */
/* Stories                                                              */
/* ------------------------------------------------------------------ */

export const Default: Story = {
  args: {
    title: 'Properties',
    subtitle: 'Dashboard Widget',
    sections: defaultSections,
    onClose: () => {},
  },
  render: (args) => (
    <div className="h-[600px] flex justify-end bg-surface-lighter">
      <PropertyPanel {...args} />
    </div>
  ),
};

export const WithFooter: Story = {
  args: {
    title: 'Properties',
    subtitle: 'Edit item settings',
    sections: defaultSections,
    onClose: () => {},
    footer: (
      <div className="flex justify-end gap-2">
        <button className="rounded-xl border border-surface-border px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-surface-lighter transition-colors">
          Cancel
        </button>
        <button className="rounded-xl bg-primary px-3 py-1.5 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark transition-colors">
          Save
        </button>
      </div>
    ),
  },
  render: (args) => (
    <div className="h-[600px] flex justify-end bg-surface-lighter">
      <PropertyPanel {...args} />
    </div>
  ),
};

export const Collapsed: Story = {
  args: {
    title: 'Properties',
    onClose: () => {},
    sections: [
      {
        title: 'General',
        defaultExpanded: true,
        children: (
          <>
            <InputField label="Name" defaultValue="Dashboard Widget" />
            <InputField label="Description" placeholder="Enter a description..." />
          </>
        ),
      },
      {
        title: 'Appearance',
        defaultExpanded: false,
        children: (
          <>
            <SelectField label="Color" options={['Blue', 'Green', 'Red', 'Purple']} />
            <SelectField label="Size" options={['Small', 'Medium', 'Large']} />
          </>
        ),
      },
      {
        title: 'Advanced',
        defaultExpanded: false,
        children: (
          <>
            <ToggleField label="Visible" defaultChecked />
            <ToggleField label="Locked" />
          </>
        ),
      },
    ],
  },
  render: (args) => (
    <div className="h-[600px] flex justify-end bg-surface-lighter">
      <PropertyPanel {...args} />
    </div>
  ),
};

export const LeftPosition: Story = {
  args: {
    title: 'Properties',
    subtitle: 'Left-aligned panel',
    position: 'left',
    sections: defaultSections,
    onClose: () => {},
  },
  render: (args) => (
    <div className="h-[600px] flex justify-start bg-surface-lighter">
      <PropertyPanel {...args} />
    </div>
  ),
};

export const CustomWidth: Story = {
  args: {
    title: 'Wide Properties',
    subtitle: 'Width set to 400px',
    width: 400,
    sections: defaultSections,
    onClose: () => {},
  },
  render: (args) => (
    <div className="h-[600px] flex justify-end bg-surface-lighter">
      <PropertyPanel {...args} />
    </div>
  ),
};

export const WithIcon: Story = {
  args: {
    title: 'Widget Settings',
    subtitle: 'Configure display options',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
    sections: defaultSections,
    onClose: () => {},
  },
  render: (args) => (
    <div className="h-[600px] flex justify-end bg-surface-lighter">
      <PropertyPanel {...args} />
    </div>
  ),
};

export const InContext: Story = {
  args: {
    title: 'Properties',
    subtitle: 'Dashboard Widget',
    sections: defaultSections,
    onClose: () => {},
  },
  render: (args) => (
    <div className="h-[600px] flex bg-surface-lighter">
      {/* Main content area */}
      <div className="flex-1 p-6">
        <h1 className="text-xl font-semibold text-text-strong mb-4">Dashboard Builder</h1>
        <div className="grid grid-cols-2 gap-4">
          {['Chart', 'Table', 'KPI Card', 'Map'].map((item) => (
            <div
              key={item}
              className="rounded-xl border border-surface-border bg-surface p-6 text-center text-sm text-text-secondary"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
      {/* Property panel */}
      <PropertyPanel {...args} />
    </div>
  ),
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  args: {
    title: 'Properties',
    subtitle: 'Responsive view',
    width: '100%',
    sections: defaultSections.slice(0, 2),
    onClose: () => {},
    footer: (
      <div className="flex gap-2">
        <button className="flex-1 rounded-xl border border-surface-border px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-surface-lighter transition-colors">
          Cancel
        </button>
        <button className="flex-1 rounded-xl bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-dark transition-colors">
          Save
        </button>
      </div>
    ),
  },
  render: (args) => (
    <div className="h-screen bg-surface-lighter">
      <PropertyPanel {...args} />
    </div>
  ),
};
