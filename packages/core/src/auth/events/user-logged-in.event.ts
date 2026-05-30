import { AppEvent } from '../../shared/events/event';

export class UserLoggedInEvent extends AppEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly userAgent?: string,
    public readonly ipAddress?: string
  ) {
    super();
  }
}

