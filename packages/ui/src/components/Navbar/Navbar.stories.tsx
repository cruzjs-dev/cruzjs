import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { Navbar } from './Navbar';
import type { NavbarItem } from './Navbar';

const navItems: NavbarItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { id: 'projects', label: 'Projects', href: '/projects' },
  { id: 'team', label: 'Team', href: '/team' },
  { id: 'settings', label: 'Settings', href: '/settings' },
];

const BellIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const AvatarCircle = () => (
  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold">
    KR
  </div>
);

const SearchInput = () => (
  <input
    type="text"
    placeholder="Search..."
    className="w-full px-3 py-1.5 text-sm rounded-lg border border-surface-border bg-surface-lighter text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
  />
);

const meta = {
  title: 'Navigation/Navbar',
  component: Navbar,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Horizontal top navigation bar with brand, nav items, search slot, and action slots. Responsive with hamburger menu on mobile.',
      },
    },
  },
  argTypes: {
    sticky: { control: 'boolean' },
    bordered: { control: 'boolean' },
    height: { control: 'number' },
  },
  args: {
    sticky: true,
    bordered: true,
    height: 56,
  },
} satisfies Meta<typeof Navbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function DefaultNavbar(args) {
    const [activeId, setActiveId] = useState('dashboard');
    return (
      <Navbar
        {...args}
        brand={<span className="text-lg font-bold text-text">Acme</span>}
        items={navItems}
        activeId={activeId}
        onNavigate={setActiveId}
        actions={
          <>
            <button type="button" className="p-2 rounded-lg text-text-secondary hover:bg-surface-lighter">
              <BellIcon />
            </button>
            <AvatarCircle />
          </>
        }
      />
    );
  },
};

export const WithSearch: Story = {
  render: function WithSearchNavbar(args) {
    const [activeId, setActiveId] = useState('dashboard');
    return (
      <Navbar
        {...args}
        brand={<span className="text-lg font-bold text-text">Acme</span>}
        items={navItems}
        activeId={activeId}
        onNavigate={setActiveId}
        search={<SearchInput />}
        actions={<AvatarCircle />}
      />
    );
  },
};

export const Sticky: Story = {
  render: function StickyNavbar(args) {
    return (
      <div>
        <Navbar
          {...args}
          sticky
          brand={<span className="text-lg font-bold text-text">Acme</span>}
          items={navItems}
          actions={<AvatarCircle />}
        />
        <div className="p-8 space-y-4">
          {Array.from({ length: 40 }, (_, i) => (
            <p key={i} className="text-text-secondary text-sm">
              Scroll down to see the sticky navbar stay fixed at the top. This is paragraph {i + 1}.
            </p>
          ))}
        </div>
      </div>
    );
  },
};

export const NoBorder: Story = {
  render: function NoBorderNavbar(args) {
    return (
      <Navbar
        {...args}
        bordered={false}
        brand={<span className="text-lg font-bold text-text">Acme</span>}
        items={navItems}
        actions={<AvatarCircle />}
      />
    );
  },
};

export const ActiveItem: Story = {
  render: function ActiveItemNavbar(args) {
    return (
      <Navbar
        {...args}
        brand={<span className="text-lg font-bold text-text">Acme</span>}
        items={navItems}
        activeId="projects"
        actions={<AvatarCircle />}
      />
    );
  },
};

export const WithActions: Story = {
  render: function WithActionsNavbar(args) {
    return (
      <Navbar
        {...args}
        brand={<span className="text-lg font-bold text-text">Acme</span>}
        items={navItems.slice(0, 2)}
        actions={
          <>
            <button type="button" className="p-2 rounded-lg text-text-secondary hover:bg-surface-lighter">
              <BellIcon />
            </button>
            <AvatarCircle />
          </>
        }
      />
    );
  },
};

export const FullExample: Story = {
  render: function FullExampleNavbar(args) {
    const [activeId, setActiveId] = useState('dashboard');
    return (
      <div>
        <Navbar
          {...args}
          brand={
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-white text-xs font-bold">
                A
              </div>
              <span className="text-lg font-bold text-text">Acme Corp</span>
            </div>
          }
          items={navItems}
          activeId={activeId}
          onNavigate={setActiveId}
          search={<SearchInput />}
          actions={
            <>
              <button type="button" className="p-2 rounded-lg text-text-secondary hover:bg-surface-lighter relative">
                <BellIcon />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <AvatarCircle />
            </>
          }
        />
        <div className="p-8">
          <h1 className="text-2xl font-bold text-text mb-4">Welcome to Acme Corp</h1>
          <p className="text-text-secondary">This is a full example of the Navbar with all features enabled.</p>
        </div>
      </div>
    );
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
  render: function MobileNavbar(args) {
    const [activeId, setActiveId] = useState('dashboard');
    return (
      <Navbar
        {...args}
        brand={<span className="text-lg font-bold text-text">Acme</span>}
        items={navItems}
        activeId={activeId}
        onNavigate={setActiveId}
        search={<SearchInput />}
        actions={
          <button type="button" className="p-2 rounded-lg text-text-secondary hover:bg-surface-lighter">
            <BellIcon />
          </button>
        }
      />
    );
  },
};
