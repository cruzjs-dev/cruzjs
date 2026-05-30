import type { Meta, StoryObj } from '@storybook/react';
import { OrgSwitcher } from './OrgSwitcher';
import type { OrgSwitcherItem } from './OrgSwitcher';

const meta = {
  title: 'Navigation/OrgSwitcher',
  component: OrgSwitcher,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Generic entity switcher dropdown. Shows the active org/workspace with avatar, a dropdown list of others, and an optional "Create new" CTA. Bottom sheet on mobile.',
      },
    },
  },
  argTypes: {
    align: { control: 'select', options: ['start', 'end'] },
    size: { control: 'select', options: ['sm', 'md'] },
    searchable: { control: 'boolean' },
  },
} satisfies Meta<typeof OrgSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

const threeOrgs: OrgSwitcherItem[] = [
  { id: 'org-1', name: 'Acme Corp', avatarSrc: 'https://i.pravatar.cc/80?img=1' },
  { id: 'org-2', name: 'Globex Inc', avatarSrc: 'https://i.pravatar.cc/80?img=2' },
  { id: 'org-3', name: 'Initech', avatarSrc: 'https://i.pravatar.cc/80?img=3' },
];

const manyOrgs: OrgSwitcherItem[] = [
  { id: 'org-1', name: 'Acme Corp' },
  { id: 'org-2', name: 'Globex Inc' },
  { id: 'org-3', name: 'Initech' },
  { id: 'org-4', name: 'Umbrella Corp' },
  { id: 'org-5', name: 'Cyberdyne Systems' },
  { id: 'org-6', name: 'Stark Industries' },
  { id: 'org-7', name: 'Wayne Enterprises' },
  { id: 'org-8', name: 'Oscorp' },
  { id: 'org-9', name: 'LexCorp' },
];

const orgsWithDescriptions: OrgSwitcherItem[] = [
  { id: 'org-1', name: 'Acme Corp', description: '12 members', avatarSrc: 'https://i.pravatar.cc/80?img=1' },
  { id: 'org-2', name: 'Globex Inc', description: 'Pro plan', avatarSrc: 'https://i.pravatar.cc/80?img=2' },
  { id: 'org-3', name: 'Initech', description: '3 members', avatarSrc: 'https://i.pravatar.cc/80?img=3' },
];

export const Default: Story = {
  args: {
    items: threeOrgs,
    activeId: 'org-1',
    onChange: (id) => alert(`Switch to ${id}`),
  },
};

export const Searchable: Story = {
  args: {
    items: manyOrgs,
    activeId: 'org-1',
    onChange: (id) => alert(`Switch to ${id}`),
    searchable: true,
  },
};

export const WithCreateNew: Story = {
  args: {
    items: threeOrgs,
    activeId: 'org-1',
    onChange: (id) => alert(`Switch to ${id}`),
    onCreateNew: () => alert('Create new org'),
    createLabel: 'Create workspace',
  },
};

export const SingleItem: Story = {
  args: {
    items: [{ id: 'org-1', name: 'Solo Workspace' }],
    activeId: 'org-1',
    onChange: (id) => alert(`Switch to ${id}`),
  },
};

export const WithDescriptions: Story = {
  args: {
    items: orgsWithDescriptions,
    activeId: 'org-2',
    onChange: (id) => alert(`Switch to ${id}`),
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  args: {
    items: threeOrgs,
    activeId: 'org-1',
    onChange: (id) => alert(`Switch to ${id}`),
    onCreateNew: () => alert('Create new org'),
  },
  render: (args) => (
    <div className="p-4">
      <OrgSwitcher {...args} />
    </div>
  ),
};
