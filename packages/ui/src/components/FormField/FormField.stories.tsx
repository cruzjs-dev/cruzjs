import type { Meta, StoryObj } from '@storybook/react';
import { FormField } from './FormField';

const meta = {
  title: 'Forms/FormField',
  component: FormField,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Generic form field wrapper providing label, required indicator, description, and error message around any input element.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    required: { control: 'boolean' },
  },
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Email',
    children: (
      <input
        type="email"
        placeholder="you@example.com"
        className="w-full h-10 px-3.5 text-sm rounded-xl border border-input-border bg-surface text-text placeholder:text-text-muted outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
      />
    ),
  },
};

export const WithDescription: Story = {
  args: {
    label: 'Username',
    description: 'This will be your public display name',
    children: (
      <input
        placeholder="johndoe"
        className="w-full h-10 px-3.5 text-sm rounded-xl border border-input-border bg-surface text-text placeholder:text-text-muted outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
      />
    ),
  },
};

export const WithError: Story = {
  args: {
    label: 'Email',
    error: 'Please enter a valid email address',
    children: (
      <input
        type="email"
        defaultValue="notanemail"
        className="w-full h-10 px-3.5 text-sm rounded-xl border border-danger bg-surface text-text placeholder:text-text-muted outline-none focus:ring-2 focus:ring-danger/30 focus:border-danger"
      />
    ),
  },
};

export const Required: Story = {
  args: {
    label: 'Full Name',
    required: true,
    children: (
      <input
        placeholder="Jane Doe"
        className="w-full h-10 px-3.5 text-sm rounded-xl border border-input-border bg-surface text-text placeholder:text-text-muted outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
      />
    ),
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-4 max-w-sm">
      <FormField label="Small" size="sm">
        <input
          placeholder="Small field"
          className="w-full h-8 px-3 text-xs rounded-lg border border-input-border bg-surface text-text placeholder:text-text-muted outline-none"
        />
      </FormField>
      <FormField label="Medium" size="md">
        <input
          placeholder="Medium field"
          className="w-full h-10 px-3.5 text-sm rounded-xl border border-input-border bg-surface text-text placeholder:text-text-muted outline-none"
        />
      </FormField>
      <FormField label="Large" size="lg">
        <input
          placeholder="Large field"
          className="w-full h-12 px-4 text-base rounded-xl border border-input-border bg-surface text-text placeholder:text-text-muted outline-none"
        />
      </FormField>
    </div>
  ),
};

export const WithSelect: Story = {
  args: {
    label: 'Country',
    description: 'Select your country of residence',
    children: (
      <select className="w-full h-10 px-3.5 text-sm rounded-xl border border-input-border bg-surface text-text outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary">
        <option value="">Choose...</option>
        <option value="us">United States</option>
        <option value="uk">United Kingdom</option>
        <option value="ca">Canada</option>
      </select>
    ),
  },
};

export const WithTextarea: Story = {
  args: {
    label: 'Bio',
    description: 'Tell us about yourself',
    required: true,
    children: (
      <textarea
        rows={3}
        placeholder="Write something..."
        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-input-border bg-surface text-text placeholder:text-text-muted outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
      />
    ),
  },
};

export const CustomLabel: Story = {
  args: {
    label: (
      <span>
        Email <span className="text-text-tertiary font-normal">(optional)</span>
      </span>
    ),
    children: (
      <input
        type="email"
        placeholder="you@example.com"
        className="w-full h-10 px-3.5 text-sm rounded-xl border border-input-border bg-surface text-text placeholder:text-text-muted outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
      />
    ),
  },
};

export const ErrorReplacesDescription: Story = {
  args: {
    label: 'Password',
    description: 'Must be at least 8 characters',
    error: 'Password is too short',
    children: (
      <input
        type="password"
        defaultValue="abc"
        className="w-full h-10 px-3.5 text-sm rounded-xl border border-danger bg-surface text-text placeholder:text-text-muted outline-none focus:ring-2 focus:ring-danger/30 focus:border-danger"
      />
    ),
  },
};
