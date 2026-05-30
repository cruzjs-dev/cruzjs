import { Injectable } from '../../di';
import { AppEvent } from './event';
import EventEmitter2, { type ListenerFn } from 'eventemitter2';

type EventListener<T extends AppEvent> = (event: T) => Promise<void> | void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventClass = abstract new (...args: any[]) => AppEvent;

@Injectable()
export class EventEmitterService {
  private emitter: EventEmitter2;
  private queuedListeners: Map<string, Set<EventListener<any>>> = new Map();
  private listenerMap: Map<EventListener<any>, ListenerFn> = new Map();
  /**
   * Tracks registered listeners per event name to prevent duplicate registrations.
   * This is critical when the DI container is cached — without deduplication,
   * listeners from @Module({ events: [...] }) would accumulate on every build.
   */
  private registeredListeners: Map<string, Set<Function>> = new Map();

  constructor() {
    this.emitter = new EventEmitter2({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: true,
    });
  }

  /**
   * Register a listener for an event.
   * Deduplicates by event name + listener reference to prevent accumulation
   * when the container is cached across requests.
   */
  on<T extends AppEvent>(
    eventClass: EventClass,
    listener: EventListener<T>
  ): void {
    const eventName = eventClass.name;

    // Deduplicate: skip if this exact listener is already registered for this event
    if (!this.registeredListeners.has(eventName)) {
      this.registeredListeners.set(eventName, new Set());
    }
    const listeners = this.registeredListeners.get(eventName)!;
    if (listeners.has(listener)) return; // Already registered
    listeners.add(listener);

    const wrapper: ListenerFn = async (event: T) => {
      await listener(event);
    };
    this.listenerMap.set(listener, wrapper);
    this.emitter.on(eventName, wrapper);
  }

  /**
   * Register a queued listener (runs in background job)
   */
  onQueue<T extends AppEvent>(
    eventClass: EventClass,
    listener: EventListener<T>
  ): void {
    const eventName = eventClass.name;
    if (!this.queuedListeners.has(eventName)) {
      this.queuedListeners.set(eventName, new Set());
    }
    this.queuedListeners.get(eventName)!.add(listener);
  }

  /**
   * Dispatch an event synchronously
   */
  async dispatch<T extends AppEvent>(event: T): Promise<void> {
    const eventName = event.constructor.name;

    // Emit to synchronous listeners
    // EventEmitter2.emit returns true if event had listeners
    // We need to manually handle async listeners
    const listeners = this.emitter.listeners(eventName);
    if (listeners.length > 0) {
      await Promise.all(
        listeners.map(async (listener) => {
          try {
            await listener(event);
          } catch (error) {
            console.error(`Error in event listener for ${eventName}:`, error);
          }
        })
      );
    }

    // Queue async listeners
    const queuedListeners = this.queuedListeners.get(eventName) || new Set();
    if (queuedListeners.size > 0) {
      // Dynamic import to avoid circular dependency at module load time
      const { buildContainerWithProviders } = await import(
        '@cruzjs/core/framework/application.server'
      );
      const { JobService } = await import('@cruzjs/core/jobs/job.service');
      const container = await buildContainerWithProviders([]);
      const jobService = container.resolve(JobService);

      for (const listener of queuedListeners) {
        await jobService.createJob({
          type: 'event-listener',
          payload: {
            eventName,
            eventData: event,
            listenerId: listener.name || 'anonymous',
          },
        });
      }
    }
  }

  /**
   * Remove a listener
   */
  off<T extends AppEvent>(
    eventClass: EventClass,
    listener: EventListener<T>
  ): void {
    const eventName = eventClass.name;
    const wrapper = this.listenerMap.get(listener);
    if (wrapper) {
      this.emitter.off(eventName, wrapper);
      this.listenerMap.delete(listener);
    }
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(eventClass?: EventClass): void {
    if (eventClass) {
      this.emitter.removeAllListeners(eventClass.name);
    } else {
      this.emitter.removeAllListeners();
    }
  }
}

