/**
 * Mock Event Emitter
 *
 * A test double for EventEmitterService that captures dispatched events
 * for assertions. No real event listeners run.
 *
 * @example
 * ```typescript
 * import { MockEventEmitter } from '@cruzjs/core/testing';
 * import { UserCreatedEvent } from './events';
 *
 * const emitter = new MockEventEmitter();
 * await emitter.dispatch(new UserCreatedEvent({ userId: '123' }));
 *
 * emitter.assertDispatched(UserCreatedEvent);
 * const events = emitter.getEvents(UserCreatedEvent);
 * expect(events).toHaveLength(1);
 * expect(events[0].userId).toBe('123');
 * ```
 */

import type { AppEvent } from '../shared/events/event';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventClass<T extends AppEvent = AppEvent> = abstract new (...args: any[]) => T;

export class MockEventEmitter {
  private events: AppEvent[] = [];

  /**
   * Record an event. Does NOT call any listeners.
   */
  async dispatch<T extends AppEvent>(event: T): Promise<void> {
    this.events.push(event);
  }

  /**
   * Get all dispatched events that are instances of the given event class.
   */
  getEvents<T extends AppEvent>(EventClass: EventClass<T>): T[] {
    return this.events.filter(
      (e) => e.constructor.name === (EventClass as Function).name,
    ) as T[];
  }

  /**
   * Clear all recorded events.
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Assert that at least one event of the given class was dispatched.
   * Throws an error with a descriptive message if not.
   */
  assertDispatched<T extends AppEvent>(EventClass: EventClass<T>): void {
    const matching = this.getEvents(EventClass);
    if (matching.length === 0) {
      const dispatched = this.events.map((e) => e.constructor.name).join(', ') || '(none)';
      throw new Error(
        `Expected event "${(EventClass as Function).name}" to have been dispatched.\n` +
        `Dispatched events: ${dispatched}`,
      );
    }
  }

  /**
   * Assert that NO events of the given class were dispatched.
   * Throws an error with a descriptive message if any were found.
   */
  assertNotDispatched<T extends AppEvent>(EventClass: EventClass<T>): void {
    const matching = this.getEvents(EventClass);
    if (matching.length > 0) {
      throw new Error(
        `Expected event "${(EventClass as Function).name}" NOT to have been dispatched, ` +
        `but ${matching.length} instance(s) were found.`,
      );
    }
  }

  /**
   * Get the total number of dispatched events.
   */
  get count(): number {
    return this.events.length;
  }

  /**
   * Stub method matching EventEmitterService.on() signature.
   * No-op in mock — events are not dispatched to listeners.
   */
  on(): void {
    // Intentional no-op for mock compatibility
  }

  /**
   * Stub method matching EventEmitterService.off() signature.
   */
  off(): void {
    // Intentional no-op for mock compatibility
  }

  /**
   * Stub method matching EventEmitterService.removeAllListeners() signature.
   */
  removeAllListeners(): void {
    // Intentional no-op for mock compatibility
  }
}
