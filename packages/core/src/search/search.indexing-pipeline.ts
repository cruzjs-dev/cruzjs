/**
 * Search Indexing Pipeline
 *
 * Event listener that auto-indexes entities when they are created, updated,
 * or deleted. Integrates with the CruzJS domain events system.
 *
 * @example
 * ```typescript
 * const pipeline = container.resolve(SearchIndexingPipeline);
 * pipeline.register('product', {
 *   onIndex: (entity) => ({
 *     id: entity.id,
 *     type: 'product',
 *     fields: { name: entity.name, description: entity.description },
 *     weight: { name: 3 },
 *   }),
 *   onRemove: (entity) => ({ id: entity.id, type: 'product' }),
 *   events: {
 *     index: ['ProductCreatedEvent', 'ProductUpdatedEvent'],
 *     remove: ['ProductDeletedEvent'],
 *   },
 * });
 * ```
 */

import { Injectable, Inject } from '../di';
import { EventEmitterService } from '../shared/events/event-emitter.service.server';
import { AppEvent } from '../shared/events/event';
import { SearchService } from './search.service';
import type { IndexOptions } from './search.types';

export interface IndexingHandler {
  onIndex: (entity: unknown) => IndexOptions;
  onRemove: (entity: unknown) => { id: string; type: string };
  events: {
    index: string[];
    remove: string[];
  };
}

@Injectable()
export class SearchIndexingPipeline {
  private readonly handlers = new Map<string, IndexingHandler>();

  constructor(
    @Inject(SearchService) private readonly searchService: SearchService,
    @Inject(EventEmitterService) private readonly eventEmitter: EventEmitterService,
  ) {}

  /**
   * Register an entity type for automatic search indexing.
   * Events listed in `handler.events.index` trigger indexing,
   * while events in `handler.events.remove` trigger removal.
   */
  register(entityType: string, handler: IndexingHandler): void {
    this.handlers.set(entityType, handler);

    // Register index event listeners
    for (const eventName of handler.events.index) {
      const EventClass = this.createEventClass(eventName);
      this.eventEmitter.on(EventClass, async (event: AppEvent) => {
        try {
          const document = handler.onIndex(event);
          await this.searchService.index(document);
        } catch (error) {
          console.error(`[SearchIndexingPipeline] Failed to index ${entityType}:`, error);
        }
      });
    }

    // Register remove event listeners
    for (const eventName of handler.events.remove) {
      const EventClass = this.createEventClass(eventName);
      this.eventEmitter.on(EventClass, async (event: AppEvent) => {
        try {
          const { id, type } = handler.onRemove(event);
          await this.searchService.remove(type, id);
        } catch (error) {
          console.error(`[SearchIndexingPipeline] Failed to remove ${entityType} from index:`, error);
        }
      });
    }
  }

  /** Get all registered entity types */
  getRegisteredTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Create a dynamic event class for event name matching.
   * EventEmitterService uses class name for event routing.
   */
  private createEventClass(eventName: string): typeof AppEvent {
    // Create a class with the same name as the event for EventEmitter matching
    const EventClass = class extends AppEvent {};
    Object.defineProperty(EventClass, 'name', { value: eventName });
    return EventClass;
  }
}
