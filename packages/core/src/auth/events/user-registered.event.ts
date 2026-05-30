import { AppEvent } from '../../shared/events/event';

export class UserRegisteredEvent extends AppEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly name: string,
    public readonly userAgent?: string,
    public readonly ipAddress?: string
  ) {
    super();
  }
}

