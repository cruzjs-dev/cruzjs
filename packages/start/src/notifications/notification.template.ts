/**
 * NotificationTemplate
 *
 * Simple mustache-style variable interpolation for notification content.
 * Immutable -- `.with()` returns a new instance with merged variables.
 *
 * Usage:
 * ```typescript
 * const tpl = NotificationTemplate.of('Hello, {{name}}! Your order #{{orderId}} is ready.');
 * const rendered = tpl.with({ name: 'Alice', orderId: '42' }).render();
 * // => "Hello, Alice! Your order #42 is ready."
 * ```
 */
export class NotificationTemplate {
  constructor(
    private readonly template: string,
    private readonly variables: Record<string, string | number> = {},
  ) {}

  /** Interpolate `{{key}}` placeholders with variable values. Unresolved placeholders are left as-is. */
  render(): string {
    return this.template.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
      this.variables[key] !== undefined ? String(this.variables[key]) : match,
    );
  }

  /** Create a new template with merged variables (does not mutate the original). */
  with(variables: Record<string, string | number>): NotificationTemplate {
    return new NotificationTemplate(this.template, { ...this.variables, ...variables });
  }

  /** Factory for creating a template with optional initial variables. */
  static of(template: string, vars?: Record<string, string | number>): NotificationTemplate {
    return new NotificationTemplate(template, vars ?? {});
  }
}
