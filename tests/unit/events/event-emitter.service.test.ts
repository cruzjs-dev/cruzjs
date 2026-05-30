import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitterService } from '@cruzjs/core/shared/events/event-emitter.service.server';
import { AppEvent } from '@cruzjs/core/shared/events/event';
import { UserRegisteredEvent } from '@cruzjs/core/auth/events/user-registered.event';

// Mock job service - the DI module was refactored
const mockJobService = {
  createJob: vi.fn(() => Promise.resolve({ id: 'job-123' })),
};

describe('EventEmitterService', () => {
  let eventEmitter: EventEmitterService;

  beforeEach(() => {
    eventEmitter = new EventEmitterService();
  });

  describe('Event Creation', () => {
    it('should create events with timestamp and eventId', () => {
      const event = new UserRegisteredEvent(
        'user-123',
        'test@example.com',
        'Test User'
      );

      expect(event).toBeInstanceOf(AppEvent);
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.eventId).toBeDefined();
      expect(event.userId).toBe('user-123');
      expect(event.email).toBe('test@example.com');
      expect(event.name).toBe('Test User');
    });

    it('should generate unique event IDs', () => {
      const event1 = new UserRegisteredEvent(
        'user-1',
        'test1@example.com',
        'User 1'
      );
      const event2 = new UserRegisteredEvent(
        'user-2',
        'test2@example.com',
        'User 2'
      );

      expect(event1.eventId).not.toBe(event2.eventId);
    });
  });

  describe('Listener Registration', () => {
    it('should register synchronous listeners', async () => {
      const listener = vi.fn();
      const event = new UserRegisteredEvent(
        'user-123',
        'test@example.com',
        'Test User'
      );

      eventEmitter.on(UserRegisteredEvent, listener);
      await eventEmitter.dispatch(event);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(event);
    });

    it('should register multiple listeners for same event', async () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const event = new UserRegisteredEvent(
        'user-123',
        'test@example.com',
        'Test User'
      );

      eventEmitter.on(UserRegisteredEvent, listener1);
      eventEmitter.on(UserRegisteredEvent, listener2);
      await eventEmitter.dispatch(event);

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('should register queued listeners', () => {
      const listener = vi.fn();

      eventEmitter.onQueue(UserRegisteredEvent, listener);

      // Queued listeners are stored but not called immediately
      // They create jobs instead
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Event Dispatch', () => {
    it('should dispatch events to synchronous listeners', async () => {
      const listener = vi.fn();
      const event = new UserRegisteredEvent(
        'user-123',
        'test@example.com',
        'Test User'
      );

      eventEmitter.on(UserRegisteredEvent, listener);
      await eventEmitter.dispatch(event);

      expect(listener).toHaveBeenCalledWith(event);
    });

    it('should handle async listeners', async () => {
      const listener = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
      const event = new UserRegisteredEvent(
        'user-123',
        'test@example.com',
        'Test User'
      );

      eventEmitter.on(UserRegisteredEvent, listener);
      await eventEmitter.dispatch(event);

      expect(listener).toHaveBeenCalled();
    });

    // TODO: This test needs refactoring for the new DI structure
    it.skip('should create jobs for queued listeners', async () => {
      const listener = vi.fn();
      const event = new UserRegisteredEvent(
        'user-123',
        'test@example.com',
        'Test User'
      );

      eventEmitter.onQueue(UserRegisteredEvent, listener);
      await eventEmitter.dispatch(event);

      expect(mockJobService.createJob).toHaveBeenCalledWith({
        type: 'event-listener',
        payload: {
          eventName: 'UserRegisteredEvent',
          eventData: event,
          listenerId: expect.any(String),
        },
      });
    });
  });

  describe('Listener Removal', () => {
    it('should remove specific listener', async () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const event = new UserRegisteredEvent(
        'user-123',
        'test@example.com',
        'Test User'
      );

      eventEmitter.on(UserRegisteredEvent, listener1);
      eventEmitter.on(UserRegisteredEvent, listener2);
      eventEmitter.off(UserRegisteredEvent, listener1);
      await eventEmitter.dispatch(event);

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('should remove all listeners for an event', async () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const event = new UserRegisteredEvent(
        'user-123',
        'test@example.com',
        'Test User'
      );

      eventEmitter.on(UserRegisteredEvent, listener1);
      eventEmitter.on(UserRegisteredEvent, listener2);
      eventEmitter.removeAllListeners(UserRegisteredEvent);
      await eventEmitter.dispatch(event);

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });

    it('should remove all listeners when no event specified', async () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const event = new UserRegisteredEvent(
        'user-123',
        'test@example.com',
        'Test User'
      );

      eventEmitter.on(UserRegisteredEvent, listener1);
      eventEmitter.on(UserRegisteredEvent, listener2);
      eventEmitter.removeAllListeners();
      await eventEmitter.dispatch(event);

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });
  });
});

