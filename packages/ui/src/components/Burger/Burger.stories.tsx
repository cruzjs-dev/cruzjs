import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { Burger } from './Burger';

const meta = {
  title: 'UI/Burger',
  component: Burger,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Animated hamburger toggle button. Three horizontal lines animate to an X when opened. Pure CSS transitions, no dependencies.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    opened: { control: 'boolean' },
    lineWidth: { control: { type: 'number', min: 1, max: 4 } },
    color: { control: 'text' },
  },
  args: {
    size: 'md',
    opened: false,
    lineWidth: 2,
  },
} satisfies Meta<typeof Burger>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function DefaultBurger(args) {
    const [opened, setOpened] = useState(args.opened);
    return <Burger {...args} opened={opened} onToggle={setOpened} />;
  },
};

export const Sizes: Story = {
  render: function SizesBurger() {
    const [smOpened, setSmOpened] = useState(false);
    const [mdOpened, setMdOpened] = useState(false);
    const [lgOpened, setLgOpened] = useState(false);
    return (
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <Burger size="sm" opened={smOpened} onToggle={setSmOpened} />
          <span className="text-xs text-text-secondary">sm</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Burger size="md" opened={mdOpened} onToggle={setMdOpened} />
          <span className="text-xs text-text-secondary">md</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Burger size="lg" opened={lgOpened} onToggle={setLgOpened} />
          <span className="text-xs text-text-secondary">lg</span>
        </div>
      </div>
    );
  },
};

export const Closed: Story = {
  args: {
    opened: false,
  },
};

export const Opened: Story = {
  args: {
    opened: true,
  },
};

export const CustomColor: Story = {
  render: function CustomColorBurger() {
    const [opened, setOpened] = useState(false);
    return (
      <Burger
        opened={opened}
        onToggle={setOpened}
        color="var(--color-primary)"
      />
    );
  },
};

export const InContext: Story = {
  render: function InContextBurger() {
    const [opened, setOpened] = useState(false);
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-surface rounded-lg border border-surface-border w-80">
        <Burger opened={opened} onToggle={setOpened} size="sm" />
        <span className="text-sm font-semibold text-text-primary">My Application</span>
      </div>
    );
  },
};
