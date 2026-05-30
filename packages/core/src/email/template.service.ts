import 'reflect-metadata';
import { render } from '@react-email/render';
import React from 'react';
import { injectable, inject } from 'inversify';
import { EmailTemplateRegistry } from './email-template.registry';

export type EmailTemplate =
  | 'welcome'
  | 'email-verification'
  | 'password-reset'
  | 'invitation'
  | 'subscription-confirmed'
  | 'subscription-canceled'
  | 'payment-failed';

export type EmailTemplateData = {
  welcome: {
    name: string;
    email: string;
    appUrl: string;
  };
  'email-verification': {
    name: string;
    verificationUrl: string;
  };
  'password-reset': {
    name: string;
    resetUrl: string;
  };
  invitation: {
    inviterName: string;
    organizationName: string;
    role: string;
    acceptUrl: string;
    declineUrl: string;
  };
  'subscription-confirmed': {
    organizationName: string;
    planName: string;
    billingUrl: string;
  };
  'subscription-canceled': {
    organizationName: string;
    planName: string;
    cancelDate: string;
    billingUrl: string;
  };
  'payment-failed': {
    organizationName: string;
    planName: string;
    amount: string;
    billingUrl: string;
  };
};

@injectable()
export class EmailTemplateService {
  constructor(
    @inject(EmailTemplateRegistry) private readonly registry: EmailTemplateRegistry
  ) {}

  async renderTemplate<T extends EmailTemplate>(
    template: T,
    data: EmailTemplateData[T]
  ): Promise<{ html: string; text: string }>;
  async renderTemplate(
    template: string,
    data: Record<string, unknown>
  ): Promise<{ html: string; text: string }>;
  async renderTemplate(
    template: string,
    data: Record<string, unknown>
  ): Promise<{ html: string; text: string }> {
    const def = this.registry.get(template);
    if (!def) {
      throw new Error(`Unknown email template: "${template}". Register it via EmailTemplateRegistry.`);
    }

    const element = React.createElement(def.component, data);

    const html = await render(element, { pretty: false });
    const text = await render(element, { plainText: true });

    return { html, text };
  }

  getSubject(template: string, data?: Record<string, unknown>): string {
    const def = this.registry.get(template);
    if (!def) {
      throw new Error(`Unknown email template: "${template}"`);
    }
    if (typeof def.subject === 'function') {
      return def.subject(data ?? {});
    }
    return def.subject;
  }
}
