import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';
import type { BadgeVariant, BadgeColor, BadgeSize } from './Badge';

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'UI/Badge',
  component: Badge,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Small count or label chip component. Supports solid, outline, and subtle variants across six semantic colors with optional dot, count display, and pill shape.',
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['solid', 'outline', 'subtle'] },
    color: { control: 'select', options: ['primary', 'success', 'warning', 'danger', 'info', 'neutral'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    dot: { control: 'boolean' },
    count: { control: 'number' },
    maxCount: { control: 'number' },
  },
  args: {
    variant: 'subtle',
    color: 'primary',
    size: 'md',
    children: 'Badge',
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const allColors: BadgeColor[] = ['primary', 'success', 'warning', 'danger', 'info', 'neutral'];
const allVariants: BadgeVariant[] = ['solid', 'outline', 'subtle'];
const allSizes: BadgeSize[] = ['sm', 'md', 'lg'];

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ─── Default ──────────────────────────────────────────────────────────────────

export const Default: Story = {};

// ─── Variants ─────────────────────────────────────────────────────────────────

export const Variants: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {allColors.map((color) => (
        <div key={color}>
          <p className="text-xs font-medium text-text-secondary mb-2">{capitalize(color)}</p>
          <div className="flex items-center gap-2">
            {allVariants.map((variant) => (
              <Badge key={variant} variant={variant} color={color}>
                {capitalize(variant)}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All three variants (solid, outline, subtle) shown for each color.',
      },
    },
  },
};

// ─── Colors ───────────────────────────────────────────────────────────────────

export const Colors: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {allVariants.map((variant) => (
        <div key={variant}>
          <p className="text-xs font-medium text-text-secondary mb-2">{capitalize(variant)}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {allColors.map((color) => (
              <Badge key={color} variant={variant} color={color}>
                {capitalize(color)}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All six colors shown per variant row.',
      },
    },
  },
};

// ─── Sizes ────────────────────────────────────────────────────────────────────

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-3">
      {allSizes.map((size) => (
        <Badge key={size} variant="solid" color="primary" size={size}>
          Size {size}
        </Badge>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Small, medium, and large sizes showing proportional padding and typography scaling.',
      },
    },
  },
};

// ─── Dot ──────────────────────────────────────────────────────────────────────

export const Dot: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        {allColors.map((color) => (
          <div key={color} className="flex items-center gap-2">
            <Badge dot color={color} size="md" />
            <span className="text-xs text-text-secondary">{capitalize(color)}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4">
        {allSizes.map((size) => (
          <div key={size} className="flex items-center gap-2">
            <Badge dot color="success" size={size} />
            <span className="text-xs text-text-secondary">{size}</span>
          </div>
        ))}
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Dot variant renders a small colored circle for status indicators. Shown across colors and sizes.',
      },
    },
  },
};

// ─── WithCount ────────────────────────────────────────────────────────────────

export const WithCount: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Badge variant="solid" color="danger" count={3} />
      <Badge variant="solid" color="danger" count={42} />
      <Badge variant="solid" color="danger" count={99} />
      <Badge variant="solid" color="danger" count={150} />
      <Badge variant="solid" color="primary" count={999} maxCount={999} />
      <Badge variant="solid" color="primary" count={1000} maxCount={999} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Count badges displaying numbers. When count exceeds maxCount (default 99), it displays "99+". The last two show a custom maxCount of 999.',
      },
    },
  },
};

// ─── OnAvatar ─────────────────────────────────────────────────────────────────

export const OnAvatar: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      {/* Badge on avatar */}
      <div className="relative inline-flex">
        <div className="w-10 h-10 rounded-full bg-primary-subtle flex items-center justify-center text-primary font-semibold text-sm">
          KR
        </div>
        <Badge
          variant="solid"
          color="danger"
          size="sm"
          count={3}
          className="absolute -top-1 -right-1 ring-2 ring-white"
        />
      </div>

      {/* Dot on avatar */}
      <div className="relative inline-flex">
        <div className="w-10 h-10 rounded-full bg-surface-lighter flex items-center justify-center text-text-secondary font-semibold text-sm">
          JD
        </div>
        <Badge
          dot
          color="success"
          size="md"
          className="absolute bottom-0 right-0 ring-2 ring-white"
        />
      </div>

      {/* Badge on icon */}
      <div className="relative inline-flex">
        <svg className="w-6 h-6 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
        <Badge
          variant="solid"
          color="danger"
          size="sm"
          count={7}
          className="absolute -top-2 -right-3 ring-2 ring-white"
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Badge positioned on avatars and icons using absolute positioning. Shows count badge and dot status indicator patterns.',
      },
    },
  },
};

// ─── Mobile ───────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  render: () => (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2 flex-wrap">
        {allColors.map((color) => (
          <Badge key={color} variant="solid" color={color} size="sm">
            {capitalize(color)}
          </Badge>
        ))}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="solid" color="danger" count={3} size="sm" />
        <Badge variant="solid" color="primary" count={150} size="sm" />
        <Badge dot color="success" size="sm" />
      </div>
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Badges rendered at 375px mobile viewport width.',
      },
    },
  },
};

// ─── OnDark ───────────────────────────────────────────────────────────────────

export const OnDark: Story = {
  render: () => (
    <div className="rounded-xl bg-dark-surface p-6 flex flex-col gap-4">
      {allVariants.map((variant) => (
        <div key={variant}>
          <p className="text-xs font-medium text-dark-text-muted mb-2">{capitalize(variant)}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {allColors.map((color) => (
              <Badge key={color} variant={variant} color={color}>
                {capitalize(color)}
              </Badge>
            ))}
          </div>
        </div>
      ))}
      <div>
        <p className="text-xs font-medium text-dark-text-muted mb-2">Dots</p>
        <div className="flex items-center gap-3">
          {allColors.map((color) => (
            <Badge key={color} dot color={color} />
          ))}
        </div>
      </div>
    </div>
  ),
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'All variants and colors on a dark background to verify contrast and readability.',
      },
    },
  },
};

// ─── Composition ──────────────────────────────────────────────────────────────

export const Composition: Story = {
  render: () => (
    <div className="max-w-sm space-y-1">
      {/* Nav-style list items with badges */}
      {[
        { label: 'Inbox', count: 12, color: 'primary' as const },
        { label: 'Issues', count: 3, color: 'danger' as const },
        { label: 'Pull Requests', count: 0, color: 'success' as const },
        { label: 'Discussions', count: 150, color: 'info' as const },
      ].map((item) => (
        <div
          key={item.label}
          className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface-lighter transition-colors cursor-pointer"
        >
          <span className="text-sm text-text">{item.label}</span>
          {item.count > 0 && (
            <Badge variant="subtle" color={item.color} size="sm" count={item.count} />
          )}
        </div>
      ))}

      {/* Status list */}
      <div className="mt-4 pt-4 border-t border-surface-border">
        <p className="text-xs font-medium text-text-tertiary px-3 mb-2">Status</p>
        {[
          { label: 'API', color: 'success' as const, status: 'Operational' },
          { label: 'Database', color: 'warning' as const, status: 'Degraded' },
          { label: 'CDN', color: 'success' as const, status: 'Operational' },
          { label: 'Auth', color: 'danger' as const, status: 'Down' },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <Badge dot color={item.color} size="md" />
              <span className="text-sm text-text">{item.label}</span>
            </div>
            <Badge variant="subtle" color={item.color} size="sm">
              {item.status}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Badges used in navigation items and a status list context, showing count badges and dot indicators in realistic UI patterns.',
      },
    },
  },
};
