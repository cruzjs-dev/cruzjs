import 'reflect-metadata';
import React from 'react';
import { injectable } from 'inversify';
import { EmailVerificationEmail } from './templates/email-verification';
import { InvitationEmail } from './templates/invitation';
import { PasswordResetEmail } from './templates/password-reset';
import { PaymentFailedEmail } from './templates/payment-failed';
import { SubscriptionCanceledEmail } from './templates/subscription-canceled';
import { SubscriptionConfirmedEmail } from './templates/subscription-confirmed';
import { WelcomeEmail } from './templates/welcome';
import { previewSamples } from './preview-samples';

export type EmailTemplateDefinition = {
  name: string;
  subject: string | ((data: Record<string, unknown>) => string);
  component: React.ComponentType<Record<string, unknown>>;
  previewData: Record<string, unknown>;
};

@injectable()
export class EmailTemplateRegistry {
  private _templates = new Map<string, EmailTemplateDefinition>();

  constructor() {
    this.registerBuiltins();
  }

  register(def: EmailTemplateDefinition): void {
    this._templates.set(def.name, def);
  }

  get(name: string): EmailTemplateDefinition | undefined {
    return this._templates.get(name);
  }

  all(): EmailTemplateDefinition[] {
    return Array.from(this._templates.values());
  }

  has(name: string): boolean {
    return this._templates.has(name);
  }

  private registerBuiltins(): void {
    const builtins: EmailTemplateDefinition[] = [
      {
        name: 'welcome',
        subject: 'Welcome!',
        component: WelcomeEmail as React.ComponentType<Record<string, unknown>>,
        previewData: previewSamples.welcome,
      },
      {
        name: 'email-verification',
        subject: 'Verify Your Email Address',
        component: EmailVerificationEmail as React.ComponentType<Record<string, unknown>>,
        previewData: previewSamples['email-verification'],
      },
      {
        name: 'password-reset',
        subject: 'Reset Your Password',
        component: PasswordResetEmail as React.ComponentType<Record<string, unknown>>,
        previewData: previewSamples['password-reset'],
      },
      {
        name: 'invitation',
        subject: "You've Been Invited",
        component: InvitationEmail as React.ComponentType<Record<string, unknown>>,
        previewData: previewSamples.invitation,
      },
      {
        name: 'subscription-confirmed',
        subject: 'Subscription Confirmed',
        component: SubscriptionConfirmedEmail as React.ComponentType<Record<string, unknown>>,
        previewData: previewSamples['subscription-confirmed'],
      },
      {
        name: 'subscription-canceled',
        subject: 'Subscription Canceled',
        component: SubscriptionCanceledEmail as React.ComponentType<Record<string, unknown>>,
        previewData: previewSamples['subscription-canceled'],
      },
      {
        name: 'payment-failed',
        subject: 'Payment Failed - Action Required',
        component: PaymentFailedEmail as React.ComponentType<Record<string, unknown>>,
        previewData: previewSamples['payment-failed'],
      },
    ];

    for (const def of builtins) {
      this._templates.set(def.name, def);
    }
  }
}
