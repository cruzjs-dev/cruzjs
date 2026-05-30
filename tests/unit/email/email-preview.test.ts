import { describe, it, expect } from 'vitest';
import { previewSamples, allTemplateNames } from '@cruzjs/core/email/preview-samples';
import { EmailTemplateService } from '@cruzjs/core/email/template.service';
import { EmailTemplateRegistry } from '@cruzjs/core/email/email-template.registry';

function makeService() {
  const registry = new EmailTemplateRegistry();
  return new EmailTemplateService(registry);
}

describe('email preview samples', () => {
  it('has sample data for every built-in template', () => {
    const expectedTemplates = [
      'welcome',
      'email-verification',
      'password-reset',
      'invitation',
      'subscription-confirmed',
      'subscription-canceled',
      'payment-failed',
    ];

    expect(allTemplateNames).toHaveLength(expectedTemplates.length);
    for (const name of expectedTemplates) {
      expect(allTemplateNames).toContain(name);
      expect(previewSamples).toHaveProperty(name);
      expect(previewSamples[name as keyof typeof previewSamples]).toBeTruthy();
    }
  });

  it('renders each template to HTML without errors', async () => {
    const service = makeService();

    for (const name of allTemplateNames) {
      const data = previewSamples[name] as Record<string, unknown>;
      const { html, text } = await service.renderTemplate(name, data);

      expect(html).toBeTruthy();
      expect(html.length).toBeGreaterThan(100);
      expect(text).toBeTruthy();
    }
  });

  it('returns a subject for each template', () => {
    const service = makeService();
    for (const name of allTemplateNames) {
      const subject = service.getSubject(name);
      expect(typeof subject).toBe('string');
      expect(subject.length).toBeGreaterThan(0);
    }
  });
});
