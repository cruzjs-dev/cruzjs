import { describe, it, expect } from 'vitest';
import React from 'react';
import { EmailTemplateRegistry } from '@cruzjs/core/email/email-template.registry';
import { EmailTemplateService } from '@cruzjs/core/email/template.service';

const CustomEmail: React.FC<Record<string, unknown>> = ({ greeting }) =>
  React.createElement('html', null,
    React.createElement('body', null,
      React.createElement('p', null, String(greeting ?? 'Hello'))
    )
  );

describe('EmailTemplateRegistry', () => {
  it('registers all 7 built-in templates on construction', () => {
    const registry = new EmailTemplateRegistry();
    const builtins = [
      'welcome', 'email-verification', 'password-reset', 'invitation',
      'subscription-confirmed', 'subscription-canceled', 'payment-failed',
    ];
    for (const name of builtins) {
      expect(registry.has(name)).toBe(true);
    }
    expect(registry.all()).toHaveLength(builtins.length);
  });

  it('registers a custom template and renders it', async () => {
    const registry = new EmailTemplateRegistry();
    registry.register({
      name: 'my-custom',
      subject: 'Custom Subject',
      component: CustomEmail,
      previewData: { greeting: 'Hi there' },
    });

    const service = new EmailTemplateService(registry);
    const { html } = await service.renderTemplate('my-custom', { greeting: 'Hi there' });

    expect(html).toContain('Hi there');
  });

  it('returns the correct subject for built-in templates', () => {
    const registry = new EmailTemplateRegistry();
    const service = new EmailTemplateService(registry);
    expect(service.getSubject('welcome')).toBe('Welcome!');
    expect(service.getSubject('password-reset')).toBe('Reset Your Password');
  });

  it('supports dynamic subject functions for custom templates', () => {
    const registry = new EmailTemplateRegistry();
    registry.register({
      name: 'dynamic-subject',
      subject: (data) => `Hello ${data['name'] ?? 'there'}`,
      component: CustomEmail,
      previewData: { name: 'World' },
    });

    const service = new EmailTemplateService(registry);
    expect(service.getSubject('dynamic-subject', { name: 'Kerry' })).toBe('Hello Kerry');
  });

  it('throws when rendering an unknown template', async () => {
    const registry = new EmailTemplateRegistry();
    const service = new EmailTemplateService(registry);
    await expect(service.renderTemplate('nonexistent', {})).rejects.toThrow('Unknown email template');
  });
});
