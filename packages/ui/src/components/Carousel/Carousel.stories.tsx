import type { Meta, StoryObj } from '@storybook/react';
import { Carousel } from './Carousel';

const meta = {
  title: 'Data Display/Carousel',
  component: Carousel,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Horizontal slide carousel with CSS scroll-snap, dot indicators, arrow navigation, auto-play, and loop support.',
      },
    },
  },
  argTypes: {
    autoPlay: { control: 'boolean' },
    autoPlayInterval: { control: 'number' },
    loop: { control: 'boolean' },
    showDots: { control: 'boolean' },
    showArrows: { control: 'boolean' },
    slidesToShow: { control: 'number' },
    gap: { control: 'number' },
    align: { control: 'select', options: ['start', 'center'] },
  },
} satisfies Meta<typeof Carousel>;

export default meta;
type Story = StoryObj<typeof meta>;

const slideColors = [
  'bg-primary/10 border-primary/30',
  'bg-emerald-500/10 border-emerald-500/30',
  'bg-amber-500/10 border-amber-500/30',
  'bg-red-500/10 border-red-500/30',
  'bg-purple-500/10 border-purple-500/30',
  'bg-cyan-500/10 border-cyan-500/30',
];

function DemoSlide({ index, label }: { index: number; label?: string }) {
  const colorClass = slideColors[index % slideColors.length];
  return (
    <div
      className={[
        'flex items-center justify-center rounded-2xl border-2 h-48',
        'text-lg font-semibold text-text-strong select-none',
        colorClass,
      ].join(' ')}
    >
      {label ?? `Slide ${index + 1}`}
    </div>
  );
}

function createSlides(count: number) {
  return Array.from({ length: count }, (_, i) => <DemoSlide key={i} index={i} />);
}

export const Default: Story = {
  args: { children: null as unknown as React.ReactNode },
  render: () => (
    <div className="max-w-2xl mx-auto">
      <Carousel>{createSlides(5)}</Carousel>
    </div>
  ),
};

export const AutoPlay: Story = {
  args: { children: null as unknown as React.ReactNode },
  render: () => (
    <div className="max-w-2xl mx-auto">
      <Carousel autoPlay autoPlayInterval={3000} loop>
        {createSlides(5)}
      </Carousel>
    </div>
  ),
};

export const Loop: Story = {
  args: { children: null as unknown as React.ReactNode },
  render: () => (
    <div className="max-w-2xl mx-auto">
      <Carousel loop>
        {createSlides(4)}
      </Carousel>
    </div>
  ),
};

export const MultipleSlidesVisible: Story = {
  args: { children: null as unknown as React.ReactNode },
  render: () => (
    <div className="max-w-4xl mx-auto">
      <Carousel slidesToShow={3} gap={16}>
        {createSlides(6)}
      </Carousel>
    </div>
  ),
};

export const WithoutDots: Story = {
  args: { children: null as unknown as React.ReactNode },
  render: () => (
    <div className="max-w-2xl mx-auto">
      <Carousel showDots={false}>
        {createSlides(4)}
      </Carousel>
    </div>
  ),
};

export const WithoutArrows: Story = {
  args: { children: null as unknown as React.ReactNode },
  render: () => (
    <div className="max-w-2xl mx-auto">
      <Carousel showArrows={false}>
        {createSlides(4)}
      </Carousel>
    </div>
  ),
};

export const CustomGap: Story = {
  args: { children: null as unknown as React.ReactNode },
  render: () => (
    <div className="max-w-4xl mx-auto">
      <Carousel slidesToShow={2} gap={32}>
        {Array.from({ length: 6 }, (_, i) => (
          <DemoSlide key={i} index={i} label={`Card ${i + 1}`} />
        ))}
      </Carousel>
    </div>
  ),
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  args: { children: null as unknown as React.ReactNode },
  render: () => (
    <div className="p-4">
      <Carousel showArrows={false}>
        {createSlides(4)}
      </Carousel>
    </div>
  ),
};
