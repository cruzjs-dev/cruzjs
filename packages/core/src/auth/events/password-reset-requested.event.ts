import { AppEvent } from '../../shared/events/event';

export class PasswordResetRequestedEvent extends AppEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string
  ) {
    super();
  }
}

