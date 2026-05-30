import type { Meta, StoryObj } from '@storybook/react';
import { Tooltip } from './Tooltip';
import { Avatar } from '../Avatar';
import { Badge } from '../Badge';

const meta = {
  title: 'Overlays/Tooltip',
  component: Tooltip,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Hover-triggered tooltip. Hidden on mobile — info must be surfaced another way on touch devices.',
      },
    },
  },
  argTypes: {
    placement: { control: 'select', options: ['top', 'bottom', 'left', 'right'] },
    delayOpen: { control: 'number' },
    delayClose: { control: 'number' },
    disabled: { control: 'boolean' },
  },
  args: {
    content: 'Helpful tooltip text',
    placement: 'top',
  },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Tooltip {...args}>
      <button className="px-4 py-2 rounded-lg bg-primary text-white font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
        Hover me
      </button>
    </Tooltip>
  ),
};

export const Placements: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-8 items-center justify-items-center" style={{ padding: '80px' }}>
      <div />
      <Tooltip content="Top placement" placement="top" delayOpen={0}>
        <button className="px-3 py-1.5 rounded-lg ring-1 ring-surface-border text-sm text-text-secondary">Top</button>
      </Tooltip>
      <div />
      <Tooltip content="Left placement" placement="left" delayOpen={0}>
        <button className="px-3 py-1.5 rounded-lg ring-1 ring-surface-border text-sm text-text-secondary">Left</button>
      </Tooltip>
      <div />
      <Tooltip content="Right placement" placement="right" delayOpen={0}>
        <button className="px-3 py-1.5 rounded-lg ring-1 ring-surface-border text-sm text-text-secondary">Right</button>
      </Tooltip>
      <div />
      <Tooltip content="Bottom placement" placement="bottom" delayOpen={0}>
        <button className="px-3 py-1.5 rounded-lg ring-1 ring-surface-border text-sm text-text-secondary">Bottom</button>
      </Tooltip>
      <div />
    </div>
  ),
};

export const WithDifferentTriggers: Story = {
  name: 'With Content',
  render: () => (
    <div className="flex gap-6 items-center">
      <Tooltip content="View profile" delayOpen={0}>
        <span>
          <Avatar name="Kerry Ritter" size="lg" status="online" />
        </span>
      </Tooltip>
      <Tooltip content="3 unread notifications" delayOpen={0}>
        <span>
          <Badge variant="solid" color="danger" count={3} />
        </span>
      </Tooltip>
      <Tooltip content="Copy to clipboard" delayOpen={0}>
        <button className="p-2 rounded-lg hover:bg-surface-lighter transition-colors duration-150">
          <svg className="w-5 h-5 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
          </svg>
        </button>
      </Tooltip>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Tooltip content="This won't show" disabled>
      <button className="px-4 py-2 rounded-lg bg-surface-lighter text-text-muted">
        Tooltip disabled
      </button>
    </Tooltip>
  ),
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'padded',
  },
  render: () => (
    <div className="p-4">
      <p className="text-xs text-text-tertiary mb-3">Tooltips do not render on mobile — info shown inline instead:</p>
      <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-lighter">
        <Avatar name="Kerry Ritter" size="md" status="online" />
        <div>
          <p className="text-sm font-medium text-text-strong">Kerry Ritter</p>
          <p className="text-xs text-text-tertiary">Engineering Lead · Online</p>
        </div>
      </div>
    </div>
  ),
};

export const OnDark: Story = {
  parameters: { backgrounds: { default: 'dark' } },
  render: () => (
    <Tooltip content="Dark background tooltip" delayOpen={0}>
      <button className="px-4 py-2 rounded-lg ring-1 ring-dark-border text-dark-text text-sm">
        Hover me
      </button>
    </Tooltip>
  ),
};

export const Composition: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Tooltip content="Dashboard" delayOpen={0}>
        <button className="p-2.5 rounded-lg hover:bg-surface-lighter transition-colors">
          <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
        </button>
      </Tooltip>
      <Tooltip content="Settings" delayOpen={0}>
        <button className="p-2.5 rounded-lg hover:bg-surface-lighter transition-colors">
          <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </Tooltip>
      <Tooltip content="Notifications" delayOpen={0}>
        <button className="p-2.5 rounded-lg hover:bg-surface-lighter transition-colors relative">
          <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
        </button>
      </Tooltip>
    </div>
  ),
};
