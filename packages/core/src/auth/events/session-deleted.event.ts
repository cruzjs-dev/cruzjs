import { AppEvent } from '../../shared/events/event';

export class SessionDeletedEvent extends AppEvent {
  constructor(
    public readonly sessionToken: string,
    public readonly userId: string
  ) {
    super();
  }
}

