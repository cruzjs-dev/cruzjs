import { describe, it, expect } from 'vitest';
import { NotificationTemplate } from '../notification.template';

describe('NotificationTemplate', () => {
  describe('render()', () => {
    it('interpolates variables into the template', () => {
      const tpl = new NotificationTemplate('Hello, {{name}}!', { name: 'Alice' });
      expect(tpl.render()).toBe('Hello, Alice!');
    });

    it('interpolates multiple variables', () => {
      const tpl = new NotificationTemplate(
        'Order #{{orderId}} for {{name}} is {{status}}.',
        { orderId: '42', name: 'Bob', status: 'shipped' },
      );
      expect(tpl.render()).toBe('Order #42 for Bob is shipped.');
    });

    it('converts numeric variables to strings', () => {
      const tpl = new NotificationTemplate('You have {{count}} items.', { count: 5 });
      expect(tpl.render()).toBe('You have 5 items.');
    });

    it('leaves unresolved placeholders intact', () => {
      const tpl = new NotificationTemplate('Hello, {{name}}! Your code is {{code}}.', { name: 'Alice' });
      expect(tpl.render()).toBe('Hello, Alice! Your code is {{code}}.');
    });

    it('returns the raw template if no variables provided', () => {
      const tpl = new NotificationTemplate('No variables here.');
      expect(tpl.render()).toBe('No variables here.');
    });

    it('handles templates with no placeholders', () => {
      const tpl = new NotificationTemplate('Plain text', { name: 'ignored' });
      expect(tpl.render()).toBe('Plain text');
    });

    it('handles empty string variables', () => {
      const tpl = new NotificationTemplate('Value: {{val}}', { val: '' });
      expect(tpl.render()).toBe('Value: ');
    });

    it('handles zero as a variable value', () => {
      const tpl = new NotificationTemplate('Count: {{count}}', { count: 0 });
      expect(tpl.render()).toBe('Count: 0');
    });
  });

  describe('with()', () => {
    it('creates a new template with merged variables', () => {
      const tpl = NotificationTemplate.of('{{greeting}}, {{name}}!', { greeting: 'Hi' });
      const withName = tpl.with({ name: 'Alice' });

      expect(withName.render()).toBe('Hi, Alice!');
      // Original should not be modified
      expect(tpl.render()).toBe('Hi, {{name}}!');
    });

    it('overrides existing variables', () => {
      const tpl = NotificationTemplate.of('Hello, {{name}}!', { name: 'Alice' });
      const overridden = tpl.with({ name: 'Bob' });

      expect(overridden.render()).toBe('Hello, Bob!');
      expect(tpl.render()).toBe('Hello, Alice!');
    });

    it('is chainable', () => {
      const result = NotificationTemplate
        .of('{{a}} {{b}} {{c}}')
        .with({ a: '1' })
        .with({ b: '2' })
        .with({ c: '3' })
        .render();

      expect(result).toBe('1 2 3');
    });
  });

  describe('static of()', () => {
    it('creates a template without variables', () => {
      const tpl = NotificationTemplate.of('Hello!');
      expect(tpl.render()).toBe('Hello!');
    });

    it('creates a template with initial variables', () => {
      const tpl = NotificationTemplate.of('Hello, {{name}}!', { name: 'Alice' });
      expect(tpl.render()).toBe('Hello, Alice!');
    });
  });
});
