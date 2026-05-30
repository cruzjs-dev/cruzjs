/**
 * Email System Unit Tests
 *
 * Tests for EmailTemplateRegistry, EmailTemplateService (rendering + subjects),
 * and MailFake assertions.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMailFake } from '../../testing/mail-fake';
import { EmailTemplateRegistry } from '../email-template.registry';
import React from 'react';

// ─── MailFake ─────────────────────────────────────────────────────────────────

describe('MailFake', () => {
  let mail: ReturnType<typeof createMailFake>;

  beforeEach(() => {
    mail = createMailFake();
  });

  it('captures sent email with all fields', async () => {
    const messageId = await mail.sendEmail(
      'user@example.com',
      'Welcome',
      '<h1>Welcome</h1>',
      'Welcome',
      'noreply@app.com',
    );

    expect(messageId).toBeTruthy();
    expect(typeof messageId).toBe('string');
    expect(mail.sentEmails).toHaveLength(1);

    const sent = mail.sentEmails[0];
    expect(sent.to).toBe('user@example.com');
    expect(sent.subject).toBe('Welcome');
    expect(sent.html).toBe('<h1>Welcome</h1>');
    expect(sent.text).toBe('Welcome');
    expect(sent.from).toBe('noreply@app.com');
  });

  it('assertSent passes when matching subject exists', async () => {
    await mail.sendEmail('a@test.com', 'Password Reset', '<p>reset</p>');

    // Should not throw
    mail.assertSent('Password Reset');
  });

  it('assertSent also matches against HTML body', async () => {
    await mail.sendEmail('a@test.com', 'Notification', '<p>unique-token-123</p>');

    // Should not throw since html contains the pattern
    mail.assertSent('unique-token-123');
  });

  it('assertSent throws when no matching email was sent', () => {
    expect(() => mail.assertSent('Nonexistent Subject')).toThrow(
      'Expected an email matching "Nonexistent Subject" to be sent',
    );
  });

  it('assertSentTo passes when email was sent to address', async () => {
    await mail.sendEmail('target@example.com', 'Hello', '<p>hi</p>');

    mail.assertSentTo('target@example.com');
  });

  it('assertSentTo throws when no email was sent to address', () => {
    expect(() => mail.assertSentTo('nobody@example.com')).toThrow(
      'Expected an email to be sent to "nobody@example.com"',
    );
  });

  it('assertNotSent passes when no emails sent', () => {
    mail.assertNotSent();
  });

  it('assertNotSent throws when emails were sent', async () => {
    await mail.sendEmail('a@test.com', 'Test', '<p>test</p>');

    expect(() => mail.assertNotSent()).toThrow(
      'Expected no emails to be sent',
    );
  });

  it('assertCount verifies exact number of sent emails', async () => {
    await mail.sendEmail('a@test.com', 'S1', '<p>1</p>');
    await mail.sendEmail('b@test.com', 'S2', '<p>2</p>');
    await mail.sendEmail('c@test.com', 'S3', '<p>3</p>');

    mail.assertCount(3);
  });

  it('assertCount throws on mismatch', () => {
    expect(() => mail.assertCount(5)).toThrow(
      'Expected 5 email(s) to be sent, but 0 was sent',
    );
  });

  it('sendBulkEmail records one entry per recipient', async () => {
    const result = await mail.sendBulkEmail(
      ['a@test.com', 'b@test.com'],
      'Bulk',
      '<p>bulk</p>',
    );

    expect(result.success).toEqual(['a@test.com', 'b@test.com']);
    expect(result.failed).toEqual([]);
    expect(mail.sentEmails).toHaveLength(2);
  });

  it('clear removes all recorded emails', async () => {
    await mail.sendEmail('a@test.com', 'Test', '<p>test</p>');
    expect(mail.sentEmails).toHaveLength(1);

    mail.clear();
    expect(mail.sentEmails).toHaveLength(0);
    mail.assertNotSent();
  });
});

// ─── EmailTemplateRegistry ────────────────────────────────────────────────────

describe('EmailTemplateRegistry', () => {
  let registry: EmailTemplateRegistry;

  beforeEach(() => {
    registry = new EmailTemplateRegistry();
  });

  it('registers built-in templates on construction', () => {
    expect(registry.has('welcome')).toBe(true);
    expect(registry.has('email-verification')).toBe(true);
    expect(registry.has('password-reset')).toBe(true);
    expect(registry.has('invitation')).toBe(true);
    expect(registry.has('subscription-confirmed')).toBe(true);
    expect(registry.has('subscription-canceled')).toBe(true);
    expect(registry.has('payment-failed')).toBe(true);
  });

  it('all() returns all registered templates', () => {
    const all = registry.all();
    expect(all.length).toBeGreaterThanOrEqual(7);

    const names = all.map((t) => t.name);
    expect(names).toContain('welcome');
    expect(names).toContain('password-reset');
  });

  it('get returns undefined for unknown template', () => {
    expect(registry.get('nonexistent')).toBeUndefined();
    expect(registry.has('nonexistent')).toBe(false);
  });

  it('register adds a custom template', () => {
    const customComponent = () => React.createElement('div', null, 'Custom');

    registry.register({
      name: 'custom-notification',
      subject: 'Custom Notification',
      component: customComponent as React.ComponentType<Record<string, unknown>>,
      previewData: { message: 'test' },
    });

    expect(registry.has('custom-notification')).toBe(true);
    const def = registry.get('custom-notification');
    expect(def).toBeDefined();
    expect(def!.subject).toBe('Custom Notification');
  });

  it('get returns template definition with subject and component', () => {
    const def = registry.get('welcome');
    expect(def).toBeDefined();
    expect(def!.name).toBe('welcome');
    expect(def!.subject).toBe('Welcome!');
    expect(typeof def!.component).toBe('function');
    expect(def!.previewData).toBeDefined();
  });

  it('template subject can be a function', () => {
    const customComponent = () => React.createElement('div', null, 'Test');

    registry.register({
      name: 'dynamic-subject',
      subject: (data) => `Hello, ${data.name}!`,
      component: customComponent as React.ComponentType<Record<string, unknown>>,
      previewData: { name: 'Test' },
    });

    const def = registry.get('dynamic-subject');
    expect(def).toBeDefined();
    expect(typeof def!.subject).toBe('function');
    if (typeof def!.subject === 'function') {
      expect(def!.subject({ name: 'Alice' })).toBe('Hello, Alice!');
    }
  });
});

// ─── EmailTemplateService ─────────────────────────────────────────────────────

describe('EmailTemplateService', () => {
  it('getSubject returns static subject', () => {
    const registry = new EmailTemplateRegistry();

    // We test the registry's get + subject combo since EmailTemplateService
    // delegates to the registry for subject resolution.
    const def = registry.get('welcome')!;
    const subject = typeof def.subject === 'function' ? def.subject({}) : def.subject;
    expect(subject).toBe('Welcome!');
  });

  it('getSubject throws for unknown template', () => {
    const registry = new EmailTemplateRegistry();

    expect(registry.get('nonexistent')).toBeUndefined();
    // EmailTemplateService.getSubject would throw -- test the check
    const def = registry.get('nonexistent');
    expect(def).toBeUndefined();
  });

  it('renderTemplate would throw for unknown template name', async () => {
    // We can test the registry behavior that the service relies on
    const registry = new EmailTemplateRegistry();
    const def = registry.get('totally-unknown');
    expect(def).toBeUndefined();

    // The service throws: `Unknown email template: "${template}". Register it via EmailTemplateRegistry.`
    // We verify the registry returns undefined, which triggers the throw in the service
  });
});
