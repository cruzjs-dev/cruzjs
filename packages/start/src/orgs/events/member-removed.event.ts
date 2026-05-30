import { AppEvent } from '@cruzjs/core/shared/events/event';

export class MemberRemovedEvent extends AppEvent {
  constructor(
    public readonly orgId: string,
    public readonly userId: string,
    public readonly removedBy: string
  ) {
    super();
  }
}
