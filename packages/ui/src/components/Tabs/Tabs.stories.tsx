import type { Meta, StoryObj } from '@storybook/react';
import { userEvent, within, expect } from '@storybook/test';
import { Tabs } from './Tabs';

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Navigation/Tabs',
  component: Tabs,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Router-agnostic tab component. Compound API: `<Tabs.List>`, `<Tabs.Tab>`, `<Tabs.Panel>`. Supports line, solid, and soft variants with an animated sliding indicator.',
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['line', 'solid', 'soft'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    orientation: { control: 'radio', options: ['horizontal', 'vertical'] },
  },
  args: {
    defaultValue: 'overview',
    variant: 'line',
    size: 'md',
    orientation: 'horizontal',
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Shared content ───────────────────────────────────────────────────────────

const panelContent: Record<string, string> = {
  overview: 'Overview content — summary stats, recent activity, quick actions.',
  settings: 'Settings content — configure preferences, integrations, and notifications.',
  members: 'Members content — invite, manage roles, and view activity.',
  billing: 'Billing content — manage plan, payment methods, and invoices.',
};

function PanelContent({ id }: { id: string }) {
  return (
    <div className="pt-4 text-sm text-text-secondary">
      {panelContent[id] ?? `${id} panel content`}
    </div>
  );
}

// ─── Default ─────────────────────────────────────────────────────────────────

export const Default: Story = {
  render: (args) => (
    <Tabs {...args}>
      <Tabs.List>
        <Tabs.Tab value="overview">Overview</Tabs.Tab>
        <Tabs.Tab value="settings">Settings</Tabs.Tab>
        <Tabs.Tab value="members">Members</Tabs.Tab>
        <Tabs.Tab value="billing">Billing</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="overview"><PanelContent id="overview" /></Tabs.Panel>
      <Tabs.Panel value="settings"><PanelContent id="settings" /></Tabs.Panel>
      <Tabs.Panel value="members"><PanelContent id="members" /></Tabs.Panel>
      <Tabs.Panel value="billing"><PanelContent id="billing" /></Tabs.Panel>
    </Tabs>
  ),
};

// ─── Variants ────────────────────────────────────────────────────────────────

export const Variants: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      {(['line', 'solid', 'soft'] as const).map((variant) => (
        <div key={variant}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
            {variant}
          </p>
          <Tabs defaultValue="overview" variant={variant}>
            <Tabs.List>
              <Tabs.Tab value="overview">Overview</Tabs.Tab>
              <Tabs.Tab value="settings">Settings</Tabs.Tab>
              <Tabs.Tab value="members">Members</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="overview"><PanelContent id="overview" /></Tabs.Panel>
            <Tabs.Panel value="settings"><PanelContent id="settings" /></Tabs.Panel>
            <Tabs.Panel value="members"><PanelContent id="members" /></Tabs.Panel>
          </Tabs>
        </div>
      ))}
    </div>
  ),
  parameters: { layout: 'padded' },
};

// ─── Sizes ───────────────────────────────────────────────────────────────────

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
            {size}
          </p>
          <Tabs defaultValue="overview" size={size}>
            <Tabs.List>
              <Tabs.Tab value="overview">Overview</Tabs.Tab>
              <Tabs.Tab value="settings">Settings</Tabs.Tab>
              <Tabs.Tab value="members">Members</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="overview"><PanelContent id="overview" /></Tabs.Panel>
            <Tabs.Panel value="settings"><PanelContent id="settings" /></Tabs.Panel>
            <Tabs.Panel value="members"><PanelContent id="members" /></Tabs.Panel>
          </Tabs>
        </div>
      ))}
    </div>
  ),
};

// ─── Vertical ────────────────────────────────────────────────────────────────

export const Vertical: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      {(['line', 'solid', 'soft'] as const).map((variant) => (
        <div key={variant}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
            vertical / {variant}
          </p>
          <Tabs defaultValue="overview" orientation="vertical" variant={variant}>
            <Tabs.List className="w-40 shrink-0">
              <Tabs.Tab value="overview">Overview</Tabs.Tab>
              <Tabs.Tab value="settings">Settings</Tabs.Tab>
              <Tabs.Tab value="members">Members</Tabs.Tab>
            </Tabs.List>
            <div className="flex-1">
              <Tabs.Panel value="overview"><PanelContent id="overview" /></Tabs.Panel>
              <Tabs.Panel value="settings"><PanelContent id="settings" /></Tabs.Panel>
              <Tabs.Panel value="members"><PanelContent id="members" /></Tabs.Panel>
            </div>
          </Tabs>
        </div>
      ))}
    </div>
  ),
};

// ─── Disabled tab ────────────────────────────────────────────────────────────

export const WithDisabledTab: Story = {
  render: () => (
    <Tabs defaultValue="overview">
      <Tabs.List>
        <Tabs.Tab value="overview">Overview</Tabs.Tab>
        <Tabs.Tab value="settings">Settings</Tabs.Tab>
        <Tabs.Tab value="billing" disabled>
          Billing (Pro only)
        </Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="overview"><PanelContent id="overview" /></Tabs.Panel>
      <Tabs.Panel value="settings"><PanelContent id="settings" /></Tabs.Panel>
      <Tabs.Panel value="billing"><PanelContent id="billing" /></Tabs.Panel>
    </Tabs>
  ),
};

// ─── With icons ──────────────────────────────────────────────────────────────

const HomeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const GearIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const UsersIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <Tabs defaultValue="overview" variant="line">
        <Tabs.List>
          <Tabs.Tab value="overview" leftIcon={<HomeIcon />}>Overview</Tabs.Tab>
          <Tabs.Tab value="settings" leftIcon={<GearIcon />}>Settings</Tabs.Tab>
          <Tabs.Tab value="members" leftIcon={<UsersIcon />}>Members</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="overview"><PanelContent id="overview" /></Tabs.Panel>
        <Tabs.Panel value="settings"><PanelContent id="settings" /></Tabs.Panel>
        <Tabs.Panel value="members"><PanelContent id="members" /></Tabs.Panel>
      </Tabs>

      <Tabs defaultValue="overview" variant="solid">
        <Tabs.List>
          <Tabs.Tab value="overview" leftIcon={<HomeIcon />}>Overview</Tabs.Tab>
          <Tabs.Tab value="settings" leftIcon={<GearIcon />}>Settings</Tabs.Tab>
          <Tabs.Tab value="members" leftIcon={<UsersIcon />}>Members</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="overview"><PanelContent id="overview" /></Tabs.Panel>
        <Tabs.Panel value="settings"><PanelContent id="settings" /></Tabs.Panel>
        <Tabs.Panel value="members"><PanelContent id="members" /></Tabs.Panel>
      </Tabs>
    </div>
  ),
};

// ─── Many tabs — horizontal scroll on mobile ─────────────────────────────────

export const ManyTabs: Story = {
  render: () => (
    <Tabs defaultValue="tab5">
      <Tabs.List>
        {Array.from({ length: 10 }, (_, i) => (
          <Tabs.Tab key={i + 1} value={`tab${i + 1}`}>
            Tab {i + 1}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {Array.from({ length: 10 }, (_, i) => (
        <Tabs.Panel key={i + 1} value={`tab${i + 1}`}>
          <PanelContent id={`Content for tab ${i + 1}`} />
        </Tabs.Panel>
      ))}
    </Tabs>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'When tabs overflow, the list scrolls horizontally. Active tab is scrolled into view automatically — especially important on mobile.',
      },
    },
  },
};

// ─── Mobile ──────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  render: () => (
    <Tabs defaultValue="overview">
      <Tabs.List>
        <Tabs.Tab value="overview" leftIcon={<HomeIcon />}>Overview</Tabs.Tab>
        <Tabs.Tab value="settings" leftIcon={<GearIcon />}>Settings</Tabs.Tab>
        <Tabs.Tab value="members" leftIcon={<UsersIcon />}>Members</Tabs.Tab>
        <Tabs.Tab value="billing">Billing</Tabs.Tab>
        <Tabs.Tab value="integrations">Integrations</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="overview"><PanelContent id="overview" /></Tabs.Panel>
      <Tabs.Panel value="settings"><PanelContent id="settings" /></Tabs.Panel>
      <Tabs.Panel value="members"><PanelContent id="members" /></Tabs.Panel>
      <Tabs.Panel value="billing"><PanelContent id="billing" /></Tabs.Panel>
      <Tabs.Panel value="integrations"><div className="pt-4 text-sm text-text-secondary">Integrations content</div></Tabs.Panel>
    </Tabs>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'On mobile, tab list scrolls horizontally with touch momentum. Active tab auto-scrolls into view.',
      },
    },
  },
};

// ─── In a card ───────────────────────────────────────────────────────────────

export const InCard: Story = {
  render: () => (
    <div className="rounded-xl border border-surface-border bg-surface shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] overflow-hidden">
      <div className="px-6 pt-6">
        <h2 className="text-sm font-semibold text-text-strong mb-4">Organization</h2>
        <Tabs defaultValue="overview">
          <Tabs.List className="-mx-6 px-6">
            <Tabs.Tab value="overview">Overview</Tabs.Tab>
            <Tabs.Tab value="settings">Settings</Tabs.Tab>
            <Tabs.Tab value="members">Members</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="overview">
            <div className="py-4 text-sm text-text-secondary">Overview panel inside a card.</div>
          </Tabs.Panel>
          <Tabs.Panel value="settings">
            <div className="py-4 text-sm text-text-secondary">Settings panel inside a card.</div>
          </Tabs.Panel>
          <Tabs.Panel value="members">
            <div className="py-4 text-sm text-text-secondary">Members panel inside a card.</div>
          </Tabs.Panel>
        </Tabs>
      </div>
    </div>
  ),
};

// ─── Keyboard navigation (play) ──────────────────────────────────────────────

export const KeyboardNavigation: Story = {
  render: () => (
    <Tabs defaultValue="overview">
      <Tabs.List>
        <Tabs.Tab value="overview">Overview</Tabs.Tab>
        <Tabs.Tab value="settings">Settings</Tabs.Tab>
        <Tabs.Tab value="members">Members</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="overview"><PanelContent id="overview" /></Tabs.Panel>
      <Tabs.Panel value="settings"><PanelContent id="settings" /></Tabs.Panel>
      <Tabs.Panel value="members"><PanelContent id="members" /></Tabs.Panel>
    </Tabs>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Initial state
    const overviewTab = canvas.getByRole('tab', { name: 'Overview' });
    await expect(overviewTab).toHaveAttribute('aria-selected', 'true');

    // Click Settings
    await userEvent.click(canvas.getByRole('tab', { name: 'Settings' }));
    await expect(canvas.getByRole('tab', { name: 'Settings' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    // Keyboard: ArrowRight → Members
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByRole('tab', { name: 'Members' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    // Keyboard: ArrowRight wraps → Overview
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    // Home / End
    await userEvent.click(canvas.getByRole('tab', { name: 'Members' }));
    await userEvent.keyboard('{Home}');
    await expect(canvas.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Automated test: click, ArrowRight (including wrap), Home.',
      },
    },
  },
};
