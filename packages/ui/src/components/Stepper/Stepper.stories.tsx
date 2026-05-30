import type { Meta, StoryObj } from '@storybook/react';
import { Stepper, StepperStep } from './Stepper';

const meta = {
  title: 'Navigation/Stepper',
  component: Stepper,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Multi-step progress indicator. Shows numbered circles, titles, descriptions, and connecting lines between steps. Supports horizontal and vertical orientation.',
      },
    },
  },
  argTypes: {
    activeStep: { control: { type: 'number', min: 0, max: 5 } },
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
  args: {
    activeStep: 1,
    orientation: 'horizontal',
    size: 'md',
  },
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Stepper {...args}>
      <StepperStep title="Account" />
      <StepperStep title="Profile" />
      <StepperStep title="Review" />
      <StepperStep title="Complete" />
    </Stepper>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="max-w-sm">
      <Stepper activeStep={2} orientation="vertical">
        <StepperStep title="Create account" />
        <StepperStep title="Verify email" />
        <StepperStep title="Set up profile" />
        <StepperStep title="Done" />
      </Stepper>
    </div>
  ),
};

export const WithDescriptions: Story = {
  render: () => (
    <Stepper activeStep={1}>
      <StepperStep
        title="Account"
        description="Create your account credentials"
      />
      <StepperStep
        title="Profile"
        description="Tell us about yourself"
      />
      <StepperStep
        title="Preferences"
        description="Customize your experience"
      />
      <StepperStep
        title="Complete"
        description="Review and confirm"
      />
    </Stepper>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <Stepper activeStep={1}>
      <StepperStep
        title="Cart"
        icon={
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M1 1.75A.75.75 0 0 1 1.75 1h1.628a1.75 1.75 0 0 1 1.734 1.51L5.18 3H17.25a.75.75 0 0 1 .727.932l-1.588 6.868a1.75 1.75 0 0 1-1.704 1.325H7.108a1.75 1.75 0 0 1-1.704-1.325L3.816 3.014a.25.25 0 0 0-.248-.216H1.75A.75.75 0 0 1 1 1.75ZM6 17.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM13.5 16a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
          </svg>
        }
      />
      <StepperStep
        title="Shipping"
        icon={
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M6.5 3c-1.045 0-2.062.318-2.871.886A3.51 3.51 0 0 0 2 6.5c0 1.076.56 2.147 1.629 2.886C4.809 10.132 6.09 10.5 7.5 10.5h5c1.41 0 2.691-.368 3.871-1.114C17.44 8.647 18 7.576 18 6.5a3.51 3.51 0 0 0-1.629-2.614C15.562 3.318 14.545 3 13.5 3h-7Z" />
            <path d="M1.5 14.25a.75.75 0 0 1 .75-.75h15.5a.75.75 0 0 1 0 1.5H2.25a.75.75 0 0 1-.75-.75ZM3 17.25a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z" />
          </svg>
        }
      />
      <StepperStep
        title="Payment"
        icon={
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M2.5 4A1.5 1.5 0 0 0 1 5.5V6h18v-.5A1.5 1.5 0 0 0 17.5 4h-15ZM19 8.5H1v6A1.5 1.5 0 0 0 2.5 16h15a1.5 1.5 0 0 0 1.5-1.5v-6ZM3 13.25a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75Zm4.75-.75a.75.75 0 0 0 0 1.5h3.5a.75.75 0 0 0 0-1.5h-3.5Z" clipRule="evenodd" />
          </svg>
        }
      />
      <StepperStep
        title="Confirm"
        icon={
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
          </svg>
        }
      />
    </Stepper>
  ),
};

export const CustomActive: Story = {
  name: 'Different Active States',
  render: () => (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-xs text-text-tertiary mb-3">Step 1 of 4</p>
        <Stepper activeStep={0}>
          <StepperStep title="Account" />
          <StepperStep title="Profile" />
          <StepperStep title="Review" />
          <StepperStep title="Done" />
        </Stepper>
      </div>
      <div>
        <p className="text-xs text-text-tertiary mb-3">Step 2 of 4</p>
        <Stepper activeStep={1}>
          <StepperStep title="Account" />
          <StepperStep title="Profile" />
          <StepperStep title="Review" />
          <StepperStep title="Done" />
        </Stepper>
      </div>
      <div>
        <p className="text-xs text-text-tertiary mb-3">Step 3 of 4</p>
        <Stepper activeStep={2}>
          <StepperStep title="Account" />
          <StepperStep title="Profile" />
          <StepperStep title="Review" />
          <StepperStep title="Done" />
        </Stepper>
      </div>
      <div>
        <p className="text-xs text-text-tertiary mb-3">All complete</p>
        <Stepper activeStep={4}>
          <StepperStep title="Account" />
          <StepperStep title="Profile" />
          <StepperStep title="Review" />
          <StepperStep title="Done" />
        </Stepper>
      </div>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-xs text-text-tertiary mb-3">Small</p>
        <Stepper activeStep={1} size="sm">
          <StepperStep title="Account" description="Credentials" />
          <StepperStep title="Profile" description="Details" />
          <StepperStep title="Done" description="Confirm" />
        </Stepper>
      </div>
      <div>
        <p className="text-xs text-text-tertiary mb-3">Medium (default)</p>
        <Stepper activeStep={1} size="md">
          <StepperStep title="Account" description="Credentials" />
          <StepperStep title="Profile" description="Details" />
          <StepperStep title="Done" description="Confirm" />
        </Stepper>
      </div>
      <div>
        <p className="text-xs text-text-tertiary mb-3">Large</p>
        <Stepper activeStep={1} size="lg">
          <StepperStep title="Account" description="Credentials" />
          <StepperStep title="Profile" description="Details" />
          <StepperStep title="Done" description="Confirm" />
        </Stepper>
      </div>
    </div>
  ),
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  render: () => (
    <div className="p-4 space-y-8">
      <div>
        <p className="text-xs text-text-tertiary mb-3">Horizontal (mobile)</p>
        <Stepper activeStep={1} size="sm">
          <StepperStep title="Account" />
          <StepperStep title="Profile" />
          <StepperStep title="Review" />
        </Stepper>
      </div>
      <div>
        <p className="text-xs text-text-tertiary mb-3">Vertical (mobile)</p>
        <Stepper activeStep={1} orientation="vertical" size="sm">
          <StepperStep title="Account" description="Create your credentials" />
          <StepperStep title="Profile" description="Tell us about yourself" />
          <StepperStep title="Review" description="Confirm details" optional />
        </Stepper>
      </div>
    </div>
  ),
};
