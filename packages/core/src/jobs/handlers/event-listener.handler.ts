import { Inject } from '../../di';
import type { Job } from '../../database/schema';
import { EventEmitterService } from '../../shared/events/event-emitter.service.server';
import type { AppEvent } from '../../shared/events/event';
import type { JobHandler, JobHandlerMetadata, JobResult } from '../job.types';
import { injectable } from 'inversify';

type EventListenerPayload = {
  eventName: string;
  eventData: AppEvent;
  listenerId: string;
};

/**
 * Event listener job handler
 * Reconstructs events and dispatches them to queued listeners
 */
@injectable()
export class EventListenerJobHandler implements JobHandler {
  readonly metadata: JobHandlerMetadata = {
    jobType: 'event-listener',
    statuses: ['PENDING'],
    description: 'Dispatches queued events to async listeners',
  };

  constructor(
    @Inject(EventEmitterService) private readonly eventEmitter: EventEmitterService
  ) {}

  async run(job: Job): Promise<JobResult> {
    const payload = job.payload as unknown as EventListenerPayload;
    const { eventName, eventData } = payload;

    if (!eventName || !eventData) {
      return {
        success: false,
        error: 'Missing required fields: eventName, eventData',
      };
    }

    try {
      await this.eventEmitter.dispatch(eventData);
      return {
        success: true,
        summary: {
          eventName,
          dispatchedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to dispatch event',
      };
    }
  }
}

