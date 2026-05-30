import type { Meta, StoryObj } from '@storybook/react';
import { OtpVerificationBlock } from './OtpVerificationBlock';

const meta = {
  title: 'Blocks/OtpVerificationBlock',
  component: OtpVerificationBlock,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'OTP verification block with pin input, resend countdown, error handling, and auto-submit on completion.',
      },
    },
  },
} satisfies Meta<typeof OtpVerificationBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    email: 'user@example.com',
  },
};

export const WithError: Story = {
  args: {
    email: 'user@example.com',
    error: 'The code you entered is incorrect. Please try again.',
  },
};

export const Loading: Story = {
  args: {
    email: 'user@example.com',
    loading: true,
  },
};

export const ResendReady: Story = {
  args: {
    email: 'user@example.com',
    resendCooldown: 0,
  },
};

export const WithLogo: Story = {
  args: {
    email: 'user@example.com',
    logo: (
      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
        <span className="text-primary-foreground font-bold text-lg">C</span>
      </div>
    ),
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  render: () => (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface">
      <OtpVerificationBlock
        email="user@example.com"
        logo={
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">C</span>
          </div>
        }
      />
    </div>
  ),
};
