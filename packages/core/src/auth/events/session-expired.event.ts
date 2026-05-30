import { AppEvent } from '../../shared/events/event';

export class SessionExpiredEvent extends AppEvent {
  constructor(
    public readonly sessionToken: string,
    public readonly userId: string
  ) {
    super();
  }
}

