import type { Meta, StoryObj } from '@storybook/react';
import { LogoCloud } from './LogoCloud';
import type { LogoItem } from './LogoCloud';

// ─── Logo fixtures ─────────────────────────────────────────────────────────

const defaultLogos: LogoItem[] = [
  { id: 'vercel', src: 'https://placehold.co/160x40/222/fff?text=Vercel', alt: 'Vercel' },
  { id: 'stripe', src: 'https://placehold.co/160x40/635bff/fff?text=Stripe', alt: 'Stripe' },
  { id: 'github', src: 'https://placehold.co/160x40/24292e/fff?text=GitHub', alt: 'GitHub' },
  { id: 'linear', src: 'https://placehold.co/160x40/5e6ad2/fff?text=Linear', alt: 'Linear' },
  { id: 'notion', src: 'https://placehold.co/160x40/000/fff?text=Notion', alt: 'Notion' },
];

const manyLogos: LogoItem[] = [
  ...defaultLogos,
  { id: 'slack', src: 'https://placehold.co/160x40/4a154b/fff?text=Slack', alt: 'Slack' },
  { id: 'figma', src: 'https://placehold.co/160x40/f24e1e/fff?text=Figma', alt: 'Figma' },
  { id: 'arc', src: 'https://placehold.co/160x40/4285f4/fff?text=Arc', alt: 'Arc' },
];

const logosWithLinks: LogoItem[] = defaultLogos.map((logo) => ({
  ...logo,
  href: `https://${logo.id}.example.com`,
}));

// ─── Meta ───────────────────────────────────────────────────────────────────

const meta = {
  title: 'Marketing/LogoCloud',
  component: LogoCloud,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Responsive logo grid for "trusted by" marketing sections. Supports grayscale-to-color hover, configurable columns, optional marquee scroll mode, and custom link rendering.',
      },
    },
  },
  argTypes: {
    columns: { control: 'select', options: [3, 4, 5, 6] },
    grayscale: { control: 'boolean' },
    marquee: { control: 'boolean' },
    maxLogoHeight: { control: 'number' },
    marqueeSpeed: { control: 'number' },
  },
  args: {
    logos: defaultLogos,
    columns: 5,
    grayscale: true,
    maxLogoHeight: 40,
  },
} satisfies Meta<typeof LogoCloud>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Default ────────────────────────────────────────────────────────────────

export const Default: Story = {};

// ─── WithHeading ────────────────────────────────────────────────────────────

export const WithHeading: Story = {
  args: {
    heading: 'Trusted by industry leaders',
  },
  parameters: {
    docs: {
      description: { story: 'Logo cloud with a heading label above the grid.' },
    },
  },
};

// ─── FourColumns ────────────────────────────────────────────────────────────

export const FourColumns: Story = {
  args: {
    logos: defaultLogos.slice(0, 4),
    columns: 4,
    heading: 'Our partners',
  },
  parameters: {
    docs: {
      description: { story: 'Four-column layout for fewer logos.' },
    },
  },
};

// ─── NoGrayscale ────────────────────────────────────────────────────────────

export const NoGrayscale: Story = {
  args: {
    grayscale: false,
    heading: 'Featured partners',
  },
  parameters: {
    docs: {
      description: { story: 'Logos displayed in full color without the grayscale filter.' },
    },
  },
};

// ─── WithLinks ──────────────────────────────────────────────────────────────

export const WithLinks: Story = {
  args: {
    logos: logosWithLinks,
    heading: 'Click to visit',
  },
  parameters: {
    docs: {
      description: { story: 'Each logo is wrapped in an anchor link to its respective site.' },
    },
  },
};

// ─── Marquee ────────────────────────────────────────────────────────────────

export const MarqueeScroll: Story = {
  args: {
    logos: manyLogos,
    marquee: true,
    marqueeSpeed: 20,
    heading: 'Trusted by teams worldwide',
  },
  parameters: {
    docs: {
      description: { story: 'Continuous horizontal scroll for large sets of logos.' },
    },
  },
};

// ─── Mobile ─────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  render: () => (
    <div className="p-4">
      <LogoCloud
        logos={defaultLogos.slice(0, 4)}
        heading="Our partners"
        maxLogoHeight={32}
      />
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: { story: 'LogoCloud at 375px mobile viewport width, two-column grid.' },
    },
  },
};
