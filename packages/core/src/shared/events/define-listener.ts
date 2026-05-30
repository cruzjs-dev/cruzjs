import type { CruzContainer } from '../../di/container/cruz-container';

/**
 * Type-safe event listener definition.
 * The event parameter is inferred from the event class -- no more `event: any`.
 *
 * @example
 * ```typescript
 * defineEventListener(UserRegisteredEvent, async (event, container) => {
 *   const emailService = container.resolve(EmailService);
 *   await emailService.sendWelcomeEmail(event.email); // event.email is typed
 * });
 * ```
 */
export function defineEventListener<T>(
  eventClass: new (...args: any[]) => T,
  listener: (event: T, container: CruzContainer) => void | Promise<void>,
): EventListenerDef<T> {
  return { event: eventClass, listener };
}

/**
 * Type-safe event listener definition type.
 * Used by `defineEventListener` and accepted by `@Module({ events: [...] })`.
 */
export type EventListenerDef<T = unknown> = {
  event: new (...args: any[]) => T;
  listener: (event: T, container: CruzContainer) => void | Promise<void>;
};
