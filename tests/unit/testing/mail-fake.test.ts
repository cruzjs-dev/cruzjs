import { describe, it, expect } from 'vitest';
import { createMailFake } from '@cruzjs/core/testing';

describe('createMailFake', () => {
  it('captures sent emails', async () => {
    const fake = createMailFake();
    await fake.sendEmail('user@example.com', 'Welcome!', '<p>Hi</p>');
    expect(fake.sentEmails).toHaveLength(1);
    expect(fake.sentEmails[0].to).toBe('user@example.com');
  });

  it('assertSentTo passes when email was sent', async () => {
    const fake = createMailFake();
    await fake.sendEmail('user@example.com', 'Hello', '<p>Hi</p>');
    expect(() => fake.assertSentTo('user@example.com')).not.toThrow();
  });

  it('assertSentTo throws when email was not sent', () => {
    const fake = createMailFake();
    expect(() => fake.assertSentTo('nobody@example.com')).toThrow();
  });

  it('assertSent passes when subject pattern matches', async () => {
    const fake = createMailFake();
    await fake.sendEmail('user@example.com', 'Welcome to App', '<p>Hi</p>');
    expect(() => fake.assertSent('Welcome')).not.toThrow();
  });

  it('assertNotSent passes when no emails were sent', () => {
    const fake = createMailFake();
    expect(() => fake.assertNotSent()).not.toThrow();
  });

  it('assertNotSent throws after sending', async () => {
    const fake = createMailFake();
    await fake.sendEmail('a@b.com', 'Hi', '<p>Hi</p>');
    expect(() => fake.assertNotSent()).toThrow();
  });

  it('assertCount matches number of sent emails', async () => {
    const fake = createMailFake();
    await fake.sendEmail('a@b.com', 'S1', '<p>1</p>');
    await fake.sendEmail('b@c.com', 'S2', '<p>2</p>');
    expect(() => fake.assertCount(2)).not.toThrow();
    expect(() => fake.assertCount(1)).toThrow();
  });

  it('clear resets sent emails', async () => {
    const fake = createMailFake();
    await fake.sendEmail('a@b.com', 'Hi', '<p>Hi</p>');
    fake.clear();
    expect(fake.sentEmails).toHaveLength(0);
    expect(() => fake.assertNotSent()).not.toThrow();
  });

  it('sendBulkEmail captures all recipients', async () => {
    const fake = createMailFake();
    const result = await fake.sendBulkEmail(['a@b.com', 'c@d.com'], 'Hi', '<p>Hi</p>');
    expect(fake.sentEmails).toHaveLength(2);
    expect(result.success).toHaveLength(2);
    expect(result.failed).toHaveLength(0);
  });
});
