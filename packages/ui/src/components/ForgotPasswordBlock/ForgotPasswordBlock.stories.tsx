import type { Meta, StoryObj } from '@storybook/react';
import { ForgotPasswordBlock } from './ForgotPasswordBlock';

const meta = {
  title: 'Blocks/ForgotPasswordBlock',
  component: ForgotPasswordBlock,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Forgot password block with email input, success state, error handling, and back-to-login link.',
      },
    },
  },
} satisfies Meta<typeof ForgotPasswordBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    backHref: '/login',
  },
};

export const Success: Story = {
  args: {
    success: true,
    backHref: '/login',
  },
};

export const WithError: Story = {
  args: {
    error: 'No account found with that email address. Please check and try again.',
    backHref: '/login',
  },
};

export const Loading: Story = {
  args: {
    loading: true,
    backHref: '/login',
  },
};

export const WithLogo: Story = {
  args: {
    backHref: '/login',
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
      <ForgotPasswordBlock
        backHref="/login"
        logo={
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">C</span>
          </div>
        }
      />
    </div>
  ),
};
