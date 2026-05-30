import { AppEvent } from '../../shared/events/event';

export class OAuthUserCreatedEvent extends AppEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly provider: string
  ) {
    super();
  }
}

