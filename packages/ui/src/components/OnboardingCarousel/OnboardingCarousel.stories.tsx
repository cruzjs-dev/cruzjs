import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import type { OnboardingSlide } from './OnboardingCarousel';
import { OnboardingCarousel } from './OnboardingCarousel';

const meta = {
  title: 'UI/OnboardingCarousel',
  component: OnboardingCarousel,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Image/video slide sequence for onboarding flows with skip, next, and done controls plus progress dots.',
      },
    },
  },
  argTypes: {
    showProgress: { control: 'boolean' },
    autoPlay: { control: 'boolean' },
    autoPlayInterval: { control: 'number' },
    completeLabel: { control: 'text' },
    skipLabel: { control: 'text' },
    nextLabel: { control: 'text' },
  },
  decorators: [
    (Story) => (
      <div style={{ height: '600px', maxWidth: '420px', margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OnboardingCarousel>;

export default meta;
type Story = StoryObj<typeof meta>;

const defaultSlides: OnboardingSlide[] = [
  {
    title: 'Welcome to the App',
    description: 'Discover a new way to organize your work and boost productivity.',
    illustration: (
      <div
        className="w-full h-full flex items-center justify-center text-4xl font-bold text-primary"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)' }}
      >
        1
      </div>
    ),
  },
  {
    title: 'Stay Organized',
    description: 'Keep track of tasks, notes, and projects all in one place.',
    illustration: (
      <div
        className="w-full h-full flex items-center justify-center text-4xl font-bold text-primary"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 25%, transparent)' }}
      >
        2
      </div>
    ),
  },
  {
    title: 'Collaborate with Your Team',
    description: 'Invite team members and work together in real time.',
    illustration: (
      <div
        className="w-full h-full flex items-center justify-center text-4xl font-bold text-primary"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 35%, transparent)' }}
      >
        3
      </div>
    ),
  },
];

export const Default: Story = {
  args: {
    slides: defaultSlides,
    onSkip: undefined,
  },
};

const imageSlides: OnboardingSlide[] = [
  {
    title: 'Capture Ideas',
    description: 'Snap photos and save them directly to your workspace.',
    illustration: (
      <div
        className="w-full h-full"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 20%, transparent)' }}
      />
    ),
  },
  {
    title: 'Organize Everything',
    description: 'Tag, sort, and filter to find anything instantly.',
    illustration: (
      <div
        className="w-full h-full"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 30%, transparent)' }}
      />
    ),
  },
  {
    title: 'Share with Anyone',
    description: 'Generate shareable links for your collections.',
    illustration: (
      <div
        className="w-full h-full"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 40%, transparent)' }}
      />
    ),
  },
];

export const WithImages: Story = {
  args: {
    slides: imageSlides,
  },
};

const StarIcon: React.FC = () => (
  <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor" className="text-primary">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const HeartIcon: React.FC = () => (
  <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor" className="text-red-500">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const RocketIcon: React.FC = () => (
  <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </svg>
);

const illustrationSlides: OnboardingSlide[] = [
  {
    title: 'Rate Your Experience',
    description: 'Let us know how we are doing.',
    illustration: (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }}
      >
        <StarIcon />
      </div>
    ),
  },
  {
    title: 'Save Your Favorites',
    description: 'Bookmark the things you love.',
    illustration: (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ backgroundColor: 'color-mix(in srgb, #ef4444 10%, transparent)' }}
      >
        <HeartIcon />
      </div>
    ),
  },
  {
    title: 'Launch Your Project',
    description: 'Deploy with a single click.',
    illustration: (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }}
      >
        <RocketIcon />
      </div>
    ),
  },
];

export const WithIllustrations: Story = {
  args: {
    slides: illustrationSlides,
  },
};

export const Interactive: Story = {
  args: {
    slides: defaultSlides,
    onComplete: () => console.log('[OnboardingCarousel] onComplete called'),
    onSkip: () => console.log('[OnboardingCarousel] onSkip called'),
  },
};

export const SingleSlide: Story = {
  args: {
    slides: [
      {
        title: 'All Done',
        description: 'You are ready to get started.',
        illustration: (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 20%, transparent)' }}
          >
            <RocketIcon />
          </div>
        ),
      },
    ],
    onComplete: () => console.log('[OnboardingCarousel] onComplete called'),
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  args: {
    slides: defaultSlides,
    onSkip: () => console.log('[OnboardingCarousel] onSkip called'),
    onComplete: () => console.log('[OnboardingCarousel] onComplete called'),
  },
};
