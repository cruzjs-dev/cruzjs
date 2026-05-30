import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { CopyableSecretModal } from './CopyableSecretModal';

const meta = {
  title: 'Overlay/CopyableSecretModal',
  component: CopyableSecretModal,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Modal for displaying a secret value that must be copied before dismissal. Used for API keys, tokens, and other one-time-visible secrets.',
      },
    },
  },
  argTypes: {
    requireCopy: { control: 'boolean' },
    title: { control: 'text' },
    description: { control: 'text' },
    label: { control: 'text' },
  },
} satisfies Meta<typeof CopyableSecretModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: false,
    onClose: () => {},
    secret: '',
  },
  render: function DefaultRender() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark active:scale-[0.98] transition-all"
        >
          Generate Secret
        </button>
        <CopyableSecretModal
          open={open}
          onClose={() => setOpen(false)}
          secret="sk_live_EXAMPLE_not_a_real_key_for_demo"
          label="API Key"
        />
      </>
    );
  },
};

export const WithMetadata: Story = {
  args: {
    open: false,
    onClose: () => {},
    secret: '',
  },
  render: function WithMetadataRender() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark active:scale-[0.98] transition-all"
        >
          Create API Key
        </button>
        <CopyableSecretModal
          open={open}
          onClose={() => setOpen(false)}
          secret="sk_live_EXAMPLE_not_a_real_key_for_demo"
          title="API Key Created"
          description="Your new API key has been generated. Copy it now."
          label="Secret Key"
          metadata={[
            { label: 'Name', value: 'Production CI/CD' },
            { label: 'Prefix', value: 'sk_live_EXAMPLE...' },
            { label: 'Scopes', value: 'Read, Write' },
          ]}
        />
      </>
    );
  },
};

export const NoCopyRequired: Story = {
  args: {
    open: false,
    onClose: () => {},
    secret: '',
  },
  render: function NoCopyRequiredRender() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark active:scale-[0.98] transition-all"
        >
          Show Token
        </button>
        <CopyableSecretModal
          open={open}
          onClose={() => setOpen(false)}
          secret="tok_abc123def456ghi789jkl012mno345pqr678stu901"
          title="Invite Token"
          description="Share this token with your team member."
          label="Token"
          requireCopy={false}
        />
      </>
    );
  },
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  args: {
    open: false,
    onClose: () => {},
    secret: '',
  },
  render: function MobileRender() {
    const [open, setOpen] = useState(false);
    return (
      <div className="p-4">
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark active:scale-[0.98] transition-all"
        >
          Generate Secret (Mobile)
        </button>
        <CopyableSecretModal
          open={open}
          onClose={() => setOpen(false)}
          secret="sk_live_EXAMPLE_not_a_real_key_for_demo"
          label="API Key"
          metadata={[
            { label: 'Name', value: 'Mobile App Key' },
            { label: 'Prefix', value: 'sk_live_EXAMPLE...' },
          ]}
        />
      </div>
    );
  },
};
