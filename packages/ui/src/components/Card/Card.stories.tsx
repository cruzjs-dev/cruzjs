import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardBody, CardFooter, CardHeader } from './Card';

const meta = {
  title: 'Layout/Card',
  component: Card,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Container with tonal surface, layered shadow, and composable header/body/footer slots.',
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['elevated', 'outlined', 'filled'] },
    padding: { control: 'select', options: ['none', 'sm', 'md', 'lg'] },
    interactive: { control: 'boolean' },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: null as unknown as React.ReactNode,
  },
  render: () => (
    <Card className="max-w-sm">
      <CardHeader>
        <h3 className="text-base font-semibold text-text-strong">Card Title</h3>
        <p className="text-sm text-text-tertiary mt-0.5">A brief description</p>
      </CardHeader>
      <CardBody>
        <p className="text-sm text-text-secondary leading-relaxed">
          This is the card body content. Cards are versatile containers for grouping related information.
        </p>
      </CardBody>
      <CardFooter>
        <div className="flex justify-end gap-3">
          <button className="rounded-xl border border-surface-border px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-surface-lighter transition-colors">
            Cancel
          </button>
          <button className="rounded-xl bg-primary px-3 py-1.5 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-primary-dark transition-colors">
            Save
          </button>
        </div>
      </CardFooter>
    </Card>
  ),
};

export const Variants: Story = {
  args: { children: null as unknown as React.ReactNode },
  render: () => (
    <div className="flex flex-wrap gap-4">
      {(['elevated', 'outlined', 'filled'] as const).map((v) => (
        <Card key={v} variant={v} className="w-64">
          <CardBody>
            <p className="text-sm font-medium text-text-strong capitalize">{v}</p>
            <p className="text-xs text-text-tertiary mt-1">Card variant style</p>
          </CardBody>
        </Card>
      ))}
    </div>
  ),
};

export const Interactive: Story = {
  args: { children: null as unknown as React.ReactNode },
  render: () => (
    <div className="flex gap-4">
      {['Design', 'Development', 'Marketing'].map((t) => (
        <Card key={t} interactive className="w-48">
          <CardBody>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-text-strong">{t}</p>
            <p className="text-xs text-text-tertiary mt-1">3 projects</p>
          </CardBody>
        </Card>
      ))}
    </div>
  ),
};

export const WithImage: Story = {
  args: { children: null as unknown as React.ReactNode },
  render: () => (
    <Card className="max-w-xs overflow-hidden">
      <div className="h-40 bg-gradient-to-br from-primary to-primary-dark" />
      <CardBody>
        <h3 className="text-base font-semibold text-text-strong">Project Aurora</h3>
        <p className="text-sm text-text-tertiary mt-1 leading-relaxed">
          A next-generation platform for building modern web applications.
        </p>
      </CardBody>
      <CardFooter>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {['A', 'B', 'C'].map((l) => (
              <div key={l} className="w-6 h-6 rounded-full bg-primary/10 ring-2 ring-surface flex items-center justify-center">
                <span className="text-[10px] font-semibold text-primary">{l}</span>
              </div>
            ))}
          </div>
          <span className="text-xs text-text-tertiary ml-1">+5 more</span>
        </div>
      </CardFooter>
    </Card>
  ),
};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
  args: { children: null as unknown as React.ReactNode },
  render: () => (
    <div className="p-4 space-y-4">
      <Card>
        <CardBody>
          <h3 className="text-base font-semibold text-text-strong">Mobile Card</h3>
          <p className="text-sm text-text-tertiary mt-1">Full-width on mobile</p>
        </CardBody>
      </Card>
      <Card variant="outlined">
        <CardBody>
          <h3 className="text-base font-semibold text-text-strong">Outlined</h3>
          <p className="text-sm text-text-tertiary mt-1">Outlined variant</p>
        </CardBody>
      </Card>
    </div>
  ),
};
