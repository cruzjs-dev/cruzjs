import { AppEvent } from '../../shared/events/event';

export class EmailVerifiedEvent extends AppEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string
  ) {
    super();
  }
}

