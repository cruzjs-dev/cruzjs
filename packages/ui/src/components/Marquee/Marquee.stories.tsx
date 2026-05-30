import type { Meta, StoryObj } from '@storybook/react';
import { Marquee } from './Marquee';

const meta = {
  title: 'Display/Marquee',
  component: Marquee,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Scrolling text/content ticker with seamless looping.',
      },
    },
  },
  argTypes: {
    speed: { control: { type: 'number', min: 10, max: 200 } },
    direction: { control: 'select', options: ['left', 'right'] },
    gap: { control: { type: 'number', min: 0, max: 100 } },
  },
} satisfies Meta<typeof Marquee>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <span className="text-sm text-text-secondary">
        Welcome to CruzJS -- The full-stack framework for Cloudflare Pages.
        Build faster, deploy anywhere.
      </span>
    ),
  },
};

export const RightToLeft: Story = {
  args: {
    direction: 'right',
    children: (
      <span className="text-sm text-text-secondary">
        This marquee scrolls from left to right instead of the default direction.
      </span>
    ),
  },
};

export const PauseOnHover: Story = {
  args: {
    pauseOnHover: true,
    children: (
      <span className="text-sm text-text-secondary">
        Hover over this marquee to pause the animation. Move the cursor away to resume.
      </span>
    ),
  },
};

export const FastSpeed: Story = {
  args: {
    speed: 150,
    children: (
      <span className="text-sm text-text-secondary">
        This marquee scrolls at 150px/s -- much faster than the default 50px/s.
      </span>
    ),
  },
};

export const WithCards: Story = {
  render: () => (
    <Marquee gap={16} pauseOnHover>
      {['React', 'TypeScript', 'Cloudflare', 'Drizzle', 'tRPC'].map((tech) => (
        <div
          key={tech}
          className="inline-flex items-center px-4 py-2 rounded-xl border border-input-border bg-surface text-sm text-text font-medium"
        >
          {tech}
        </div>
      ))}
    </Marquee>
  ),
};
