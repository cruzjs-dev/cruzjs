/**
 * EventEmitterService Unit Tests
 *
 * Tests for synchronous event dispatching, multiple listeners,
 * async listener handling, and error isolation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitterService } from '../event-emitter.service.server';
import { AppEvent } from '../event';

// ─── Test Events ──────────────────────────────────────────────────────────────

class UserCreatedEvent extends AppEvent {
  constructor(public readonly userId: string) {
    super();
  }
}

class OrderPlacedEvent extends AppEvent {
  constructor(
    public readonly orderId: string,
    public readonly total: number,
  ) {
    super();
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('EventEmitterService', () => {
  let emitter: EventEmitterService;

  beforeEach(() => {
    emitter = new EventEmitterService();
  });

  it('calls listener when event is dispatched', async () => {
    const handler = vi.fn();
    emitter.on(UserCreatedEvent, handler);

    const event = new UserCreatedEvent('user-1');
    await emitter.dispatch(event);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(event);
  });

  it('passes event data to the listener', async () => {
    let receivedEvent: OrderPlacedEvent | undefined;
    emitter.on(OrderPlacedEvent, (event: OrderPlacedEvent) => {
      receivedEvent = event;
    });

    const event = new OrderPlacedEvent('order-42', 99.99);
    await emitter.dispatch(event);

    expect(receivedEvent).toBeDefined();
    expect(receivedEvent!.orderId).toBe('order-42');
    expect(receivedEvent!.total).toBe(99.99);
  });

  it('multiple listeners all receive the event', async () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const handler3 = vi.fn();

    emitter.on(UserCreatedEvent, handler1);
    emitter.on(UserCreatedEvent, handler2);
    emitter.on(UserCreatedEvent, handler3);

    const event = new UserCreatedEvent('user-1');
    await emitter.dispatch(event);

    expect(handler1).toHaveBeenCalledOnce();
    expect(handler2).toHaveBeenCalledOnce();
    expect(handler3).toHaveBeenCalledOnce();
  });

  it('async listener is awaited before dispatch resolves', async () => {
    const order: string[] = [];

    emitter.on(UserCreatedEvent, async () => {
      await new Promise((r) => setTimeout(r, 10));
      order.push('listener-done');
    });

    await emitter.dispatch(new UserCreatedEvent('user-1'));
    order.push('dispatch-done');

    // listener-done must appear before dispatch-done because dispatch awaits listeners
    expect(order).toEqual(['listener-done', 'dispatch-done']);
  });

  it('dispatch returns resolved Promise when all listeners are done', async () => {
    let completed = false;

    emitter.on(UserCreatedEvent, async () => {
      await new Promise((r) => setTimeout(r, 5));
      completed = true;
    });

    const promise = emitter.dispatch(new UserCreatedEvent('user-1'));
    expect(promise).toBeInstanceOf(Promise);

    await promise;
    expect(completed).toBe(true);
  });

  it('listener error does not crash other listeners', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const handler1 = vi.fn();
    const throwingHandler = vi.fn().mockRejectedValue(new Error('boom'));
    const handler3 = vi.fn();

    emitter.on(UserCreatedEvent, handler1);
    emitter.on(UserCreatedEvent, throwingHandler);
    emitter.on(UserCreatedEvent, handler3);

    // dispatch should not throw even though one listener throws
    await expect(
      emitter.dispatch(new UserCreatedEvent('user-1')),
    ).resolves.toBeUndefined();

    expect(handler1).toHaveBeenCalledOnce();
    expect(throwingHandler).toHaveBeenCalledOnce();
    expect(handler3).toHaveBeenCalledOnce();

    // Error should have been logged
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error in event listener for UserCreatedEvent'),
      expect.any(Error),
    );

    errorSpy.mockRestore();
  });

  it('does not call listeners for unrelated events', async () => {
    const userHandler = vi.fn();
    emitter.on(UserCreatedEvent, userHandler);

    await emitter.dispatch(new OrderPlacedEvent('order-1', 50));

    expect(userHandler).not.toHaveBeenCalled();
  });

  it('deduplicates identical listener references', async () => {
    const handler = vi.fn();

    // Register same listener twice
    emitter.on(UserCreatedEvent, handler);
    emitter.on(UserCreatedEvent, handler);

    await emitter.dispatch(new UserCreatedEvent('user-1'));

    // Should only be called once due to deduplication
    expect(handler).toHaveBeenCalledOnce();
  });

  it('off removes a listener', async () => {
    const handler = vi.fn();
    emitter.on(UserCreatedEvent, handler);

    emitter.off(UserCreatedEvent, handler);

    await emitter.dispatch(new UserCreatedEvent('user-1'));
    expect(handler).not.toHaveBeenCalled();
  });

  it('removeAllListeners clears listeners for a specific event', async () => {
    const userHandler = vi.fn();
    const orderHandler = vi.fn();

    emitter.on(UserCreatedEvent, userHandler);
    emitter.on(OrderPlacedEvent, orderHandler);

    emitter.removeAllListeners(UserCreatedEvent);

    await emitter.dispatch(new UserCreatedEvent('user-1'));
    await emitter.dispatch(new OrderPlacedEvent('order-1', 10));

    expect(userHandler).not.toHaveBeenCalled();
    expect(orderHandler).toHaveBeenCalledOnce();
  });

  it('removeAllListeners with no argument clears all listeners', async () => {
    const userHandler = vi.fn();
    const orderHandler = vi.fn();

    emitter.on(UserCreatedEvent, userHandler);
    emitter.on(OrderPlacedEvent, orderHandler);

    emitter.removeAllListeners();

    await emitter.dispatch(new UserCreatedEvent('user-1'));
    await emitter.dispatch(new OrderPlacedEvent('order-1', 10));

    expect(userHandler).not.toHaveBeenCalled();
    expect(orderHandler).not.toHaveBeenCalled();
  });

  it('AppEvent has timestamp and eventId', () => {
    const event = new UserCreatedEvent('user-1');
    expect(event.timestamp).toBeInstanceOf(Date);
    expect(typeof event.eventId).toBe('string');
    expect(event.eventId.length).toBeGreaterThan(0);
  });
});
