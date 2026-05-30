import { AppEvent } from '../../shared/events/event';

export class SessionCreatedEvent extends AppEvent {
  constructor(
    public readonly sessionToken: string,
    public readonly userId: string,
    public readonly userAgent?: string,
    public readonly ipAddress?: string
  ) {
    super();
  }
}

