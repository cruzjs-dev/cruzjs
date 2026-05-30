import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ContactSection } from './ContactSection';

// ─── Meta ───────────────────────────────────────────────────────────────────

const meta = {
  title: 'Marketing/ContactSection',
  component: ContactSection,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Contact section with form and info block for marketing pages. Two-column layout that stacks on mobile, with slots for form, contact info, social links, and an optional map.',
      },
    },
  },
  argTypes: {
    reversed: { control: 'boolean' },
  },
} satisfies Meta<typeof ContactSection>;

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Shared elements ────────────────────────────────────────────────────────

const MockForm: React.FC = () => (
  <form
    onSubmit={(e) => e.preventDefault()}
    className="flex flex-col gap-4"
  >
    <div className="flex flex-col gap-1.5">
      <label htmlFor="name" className="text-sm font-medium text-text">
        Name
      </label>
      <input
        id="name"
        type="text"
        placeholder="Your name"
        className="rounded-lg border border-surface-border px-3 py-2 text-sm bg-surface text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
      />
    </div>
    <div className="flex flex-col gap-1.5">
      <label htmlFor="email" className="text-sm font-medium text-text">
        Email
      </label>
      <input
        id="email"
        type="email"
        placeholder="you@example.com"
        className="rounded-lg border border-surface-border px-3 py-2 text-sm bg-surface text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
      />
    </div>
    <div className="flex flex-col gap-1.5">
      <label htmlFor="message" className="text-sm font-medium text-text">
        Message
      </label>
      <textarea
        id="message"
        rows={4}
        placeholder="How can we help?"
        className="rounded-lg border border-surface-border px-3 py-2 text-sm bg-surface text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
      />
    </div>
    <button
      type="submit"
      className="mt-2 bg-primary text-surface px-6 py-2.5 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
    >
      Send Message
    </button>
  </form>
);

const EmailIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const PhoneIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const MapPinIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const defaultContactInfo = [
  {
    icon: <EmailIcon />,
    label: 'Email',
    value: 'hello@cruzjs.dev',
  },
  {
    icon: <PhoneIcon />,
    label: 'Phone',
    value: '+1 (555) 123-4567',
  },
  {
    icon: <MapPinIcon />,
    label: 'Address',
    value: '123 Developer Lane, San Francisco, CA 94102',
  },
];

const SocialLinks: React.FC = () => (
  <div className="flex gap-3">
    {['Twitter', 'GitHub', 'Discord'].map((name) => (
      <a
        key={name}
        href="#"
        className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-surface-border text-text-secondary hover:text-primary hover:border-primary transition-colors text-sm font-medium"
      >
        {name[0]}
      </a>
    ))}
  </div>
);

const MockMap: React.FC = () => (
  <div
    className="w-full h-48 bg-surface-lighter flex items-center justify-center text-text-secondary text-sm"
  >
    Map Placeholder
  </div>
);

// ─── Default ──────────────────────────────────────────────────────────────

export const Default: Story = {
  args: {
    heading: 'Get in Touch',
    description:
      "Have a question or want to work together? Fill out the form and we'll get back to you within 24 hours.",
    form: <MockForm />,
    contactInfo: defaultContactInfo,
  },
};

// ─── WithMap ──────────────────────────────────────────────────────────────

export const WithMap: Story = {
  args: {
    heading: 'Visit Our Office',
    description: 'Come say hello at our headquarters.',
    form: <MockForm />,
    contactInfo: defaultContactInfo,
    map: <MockMap />,
  },
  parameters: {
    docs: {
      description: {
        story: 'Contact section with an embedded map slot below the contact info.',
      },
    },
  },
};

// ─── Reversed ─────────────────────────────────────────────────────────────

export const Reversed: Story = {
  args: {
    heading: 'Contact Us',
    description: 'Our team is here to help.',
    form: <MockForm />,
    contactInfo: defaultContactInfo,
    reversed: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Reversed layout with contact info on the left and form on the right.',
      },
    },
  },
};

// ─── WithSocialLinks ──────────────────────────────────────────────────────

export const WithSocialLinks: Story = {
  args: {
    heading: 'Reach Out',
    description: 'Connect with us through any channel.',
    form: <MockForm />,
    contactInfo: defaultContactInfo,
    socialLinks: <SocialLinks />,
  },
  parameters: {
    docs: {
      description: {
        story: 'Contact section with social link icons below the contact info.',
      },
    },
  },
};

// ─── Mobile ───────────────────────────────────────────────────────────────

export const Mobile: Story = {
  args: {
    heading: 'Get in Touch',
    description: 'We would love to hear from you.',
    form: <MockForm />,
    contactInfo: defaultContactInfo,
    socialLinks: <SocialLinks />,
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'ContactSection at 375px mobile viewport width with stacked layout.',
      },
    },
  },
};
