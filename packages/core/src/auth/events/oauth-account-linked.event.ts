import { AppEvent } from '../../shared/events/event';

export class OAuthAccountLinkedEvent extends AppEvent {
  constructor(
    public readonly userId: string,
    public readonly provider: string,
    public readonly providerAccountId: string
  ) {
    super();
  }
}

