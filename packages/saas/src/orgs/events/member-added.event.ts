import { AppEvent } from '@cruzjs/core/shared/events/event';

export class MemberAddedEvent extends AppEvent {
  constructor(
    public readonly orgId: string,
    public readonly userId: string,
    public readonly role: string,
    public readonly addedBy: string
  ) {
    super();
  }
}

