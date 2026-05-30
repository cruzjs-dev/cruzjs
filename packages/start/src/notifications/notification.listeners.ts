import type { EventEmitterService } from '@cruzjs/core/shared/events/event-emitter.service.server';
import type { CruzContainer } from '@cruzjs/core/di';

export function registerNotificationEventListeners(
  _events: EventEmitterService,
  _container: CruzContainer
): void {
  // Register domain event listeners here to trigger notifications.
}
