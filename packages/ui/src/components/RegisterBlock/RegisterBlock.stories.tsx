import type { Meta, StoryObj } from '@storybook/react';
import { RegisterBlock } from './RegisterBlock';

const meta = {
  title: 'Blocks/RegisterBlock',
  component: RegisterBlock,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Registration form block with name, email, password, terms checkbox, and social OAuth.',
      },
    },
  },
} satisfies Meta<typeof RegisterBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithSocial: Story = {
  args: {
    socialProviders: [
      {
        id: 'google',
        label: 'Google',
        icon: (
          <svg viewBox="0 0 24 24" className="w-full h-full">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
        ),
      },
      {
        id: 'github',
        label: 'GitHub',
        icon: (
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
        ),
      },
    ],
  },
};

export const WithPasswordRequirements: Story = {
  args: {
    passwordRequirements: [
      'At least 8 characters',
      'One uppercase letter',
      'One number',
      'One special character',
    ],
  },
};

export const WithError: Story = {
  args: {
    error: 'An account with this email already exists.',
  },
};

export const Loading: Story = {
  args: {
    loading: true,
  },
};

export const WithLogo: Story = {
  args: {
    logo: (
      <div className="flex items-center gap-2 text-primary">
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-8 h-8"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        <span className="text-lg font-bold text-text-strong">Acme</span>
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
    <div className="p-4">
      <RegisterBlock
        passwordRequirements={['At least 8 characters', 'One uppercase letter']}
        socialProviders={[
          {
            id: 'google',
            label: 'Google',
            icon: (
              <svg viewBox="0 0 24 24" className="w-full h-full">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
              </svg>
            ),
          },
        ]}
      />
    </div>
  ),
};
