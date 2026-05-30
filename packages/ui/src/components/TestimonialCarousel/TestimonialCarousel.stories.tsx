import type { Meta, StoryObj } from '@storybook/react';
import type { Testimonial } from './TestimonialCarousel';
import { TestimonialCarousel } from './TestimonialCarousel';

// ─── Meta ───────────────────────────────────────────────────────────────────

const meta = {
  title: 'Marketing/TestimonialCarousel',
  component: TestimonialCarousel,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A testimonial/quote carousel for marketing pages. Displays author quotes with avatar, name, role, optional star ratings, auto-rotation, and navigation dots.',
      },
    },
  },
  argTypes: {
    autoPlay: { control: 'boolean' },
    interval: { control: 'number' },
    pauseOnHover: { control: 'boolean' },
    showDots: { control: 'boolean' },
    showArrows: { control: 'boolean' },
  },
} satisfies Meta<typeof TestimonialCarousel>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Shared test data ───────────────────────────────────────────────────────

const sampleTestimonials: Testimonial[] = [
  {
    id: '1',
    quote:
      'CruzJS cut our development time in half. Auth, billing, and team management were ready out of the box.',
    authorName: 'Sarah Chen',
    authorRole: 'CTO',
    authorCompany: 'LaunchPad AI',
    avatarSrc: 'https://i.pravatar.cc/80?u=sarah',
  },
  {
    id: '2',
    quote:
      'We migrated from a custom stack and had everything running on Cloudflare in under a week. The DX is phenomenal.',
    authorName: 'Marcus Rivera',
    authorRole: 'Lead Engineer',
    authorCompany: 'StreamFlow',
    avatarSrc: 'https://i.pravatar.cc/80?u=marcus',
  },
  {
    id: '3',
    quote:
      'The module system and DI container make it easy to keep our codebase clean as we scale. Highly recommended.',
    authorName: 'Priya Patel',
    authorRole: 'Engineering Manager',
    authorCompany: 'NovaTech',
    avatarSrc: 'https://i.pravatar.cc/80?u=priya',
  },
];

const ratedTestimonials: Testimonial[] = [
  {
    id: 'r1',
    quote:
      'Five stars, no question. The best full-stack framework I have used in the past decade.',
    authorName: 'James O\'Brien',
    authorRole: 'Founder',
    authorCompany: 'DevForge',
    avatarSrc: 'https://i.pravatar.cc/80?u=james',
    rating: 5,
  },
  {
    id: 'r2',
    quote:
      'Solid architecture and great defaults. A few rough edges in the CLI but the core is rock-solid.',
    authorName: 'Li Wei',
    authorRole: 'Staff Engineer',
    authorCompany: 'CloudBase',
    avatarSrc: 'https://i.pravatar.cc/80?u=liwei',
    rating: 4,
  },
  {
    id: 'r3',
    quote:
      'Deployed our SaaS MVP in three days. The Drizzle + D1 integration is seamless.',
    authorName: 'Amara Obi',
    authorRole: 'Product Lead',
    authorCompany: 'QuickShip',
    avatarSrc: 'https://i.pravatar.cc/80?u=amara',
    rating: 5,
  },
];

// ─── Default ────────────────────────────────────────────────────────────────

export const Default: Story = {
  args: {
    testimonials: sampleTestimonials,
  },
};

// ─── WithRatings ────────────────────────────────────────────────────────────

export const WithRatings: Story = {
  args: {
    testimonials: ratedTestimonials,
  },
  parameters: {
    docs: {
      description: {
        story: 'Testimonial cards with optional star ratings displayed above the quote.',
      },
    },
  },
};

// ─── AutoPlay ───────────────────────────────────────────────────────────────

export const AutoPlay: Story = {
  args: {
    testimonials: sampleTestimonials,
    autoPlay: true,
    interval: 3000,
    pauseOnHover: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Auto-rotating carousel. Pauses on hover. Respects `prefers-reduced-motion` by disabling auto-rotation.',
      },
    },
  },
};

// ─── NoDots ─────────────────────────────────────────────────────────────────

export const NoDots: Story = {
  args: {
    testimonials: sampleTestimonials,
    showDots: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Carousel with navigation dots hidden. Use arrows or swipe to navigate.',
      },
    },
  },
};

// ─── Mobile ─────────────────────────────────────────────────────────────────

export const Mobile: Story = {
  args: {
    testimonials: ratedTestimonials,
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: {
        story:
          'Mobile viewport (375px). Arrows are hidden; swipe to navigate. Single card layout.',
      },
    },
  },
};
