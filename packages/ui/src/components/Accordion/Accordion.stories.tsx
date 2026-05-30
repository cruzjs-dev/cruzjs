import type { Meta, StoryObj } from '@storybook/react';
import { Accordion, AccordionItem } from './Accordion';

const meta = {
  title: 'Data Display/Accordion',
  component: Accordion,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Collapsible content sections with spring-animated height transitions.',
      },
    },
  },
  argTypes: {
    type: { control: 'select', options: ['single', 'multiple'] },
    variant: { control: 'select', options: ['default', 'bordered', 'separated'] },
  },
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

const faqItems = [
  {
    value: '1',
    title: 'How do I get started?',
    content: 'Create a new project with npx create-cruz-app, then run cruz dev to start the development server. The CLI handles all setup including database migrations.',
  },
  {
    value: '2',
    title: 'Can I deploy to any cloud provider?',
    content: 'CruzJS supports Cloudflare Pages, AWS Lambda, Google Cloud Run, Azure Functions, DigitalOcean, and Docker. Use the runtime adapter for your target platform.',
  },
  {
    value: '3',
    title: 'Is there a free tier?',
    content: 'Yes! CruzJS is open source and free to use. Cloudflare offers a generous free tier that covers most hobby projects. You only pay for resources you use.',
  },
  {
    value: '4',
    title: 'How does authentication work?',
    content: 'Built-in auth with email/password, magic links, and OAuth providers. Session management is handled automatically with secure HTTP-only cookies.',
  },
];

export const Default: Story = {
  args: { children: null as unknown as React.ReactNode },
  render: () => (
    <div className="max-w-lg">
      <Accordion>
        {faqItems.map((item) => (
          <AccordionItem key={item.value} value={item.value} title={item.title}>
            {item.content}
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  ),
};

export const Bordered: Story = {
  args: { children: null as unknown as React.ReactNode },
  render: () => (
    <div className="max-w-lg">
      <Accordion variant="bordered">
        {faqItems.map((item) => (
          <AccordionItem key={item.value} value={item.value} title={item.title}>
            {item.content}
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  ),
};

export const Separated: Story = {
  args: { children: null as unknown as React.ReactNode },
  render: () => (
    <div className="max-w-lg">
      <Accordion variant="separated">
        {faqItems.map((item) => (
          <AccordionItem key={item.value} value={item.value} title={item.title}>
            {item.content}
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  ),
};

export const Multiple: Story = {
  args: { children: null as unknown as React.ReactNode },
  render: () => (
    <div className="max-w-lg">
      <Accordion type="multiple" variant="bordered" defaultValue={['1', '3']}>
        {faqItems.map((item) => (
          <AccordionItem key={item.value} value={item.value} title={item.title}>
            {item.content}
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  ),
};

export const WithSubtitles: Story = {
  args: { children: null as unknown as React.ReactNode },
  render: () => (
    <div className="max-w-lg">
      <Accordion variant="separated">
        <AccordionItem value="billing" title="Billing & Plans" subtitle="Manage subscription and payment methods">
          Update your payment method, change plans, or view invoices from the billing settings page.
        </AccordionItem>
        <AccordionItem value="security" title="Security" subtitle="Two-factor auth and session management">
          Enable 2FA, manage active sessions, and configure password policies for your organization.
        </AccordionItem>
        <AccordionItem value="team" title="Team Members" subtitle="Invite and manage team access">
          Add team members, assign roles, and control permissions across your organization.
        </AccordionItem>
      </Accordion>
    </div>
  ),
};

export const Disabled: Story = {
  args: { children: null as unknown as React.ReactNode },
  render: () => (
    <div className="max-w-lg">
      <Accordion variant="bordered">
        <AccordionItem value="1" title="Available Section">
          This section can be expanded and collapsed normally.
        </AccordionItem>
        <AccordionItem value="2" title="Locked Section (Pro)" disabled>
          This content requires a Pro subscription.
        </AccordionItem>
        <AccordionItem value="3" title="Another Available Section">
          This section is also expandable.
        </AccordionItem>
      </Accordion>
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
      <Accordion variant="separated">
        {faqItems.slice(0, 3).map((item) => (
          <AccordionItem key={item.value} value={item.value} title={item.title}>
            {item.content}
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  ),
};
