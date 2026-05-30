import { AppEvent } from '../../shared/events/event';

export class PasswordResetCompletedEvent extends AppEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string
  ) {
    super();
  }
}

