import { AppEvent } from '../../shared/events/event';

export class UserLoggedOutEvent extends AppEvent {
  constructor(
    public readonly userId: string,
    public readonly sessionToken: string
  ) {
    super();
  }
}

