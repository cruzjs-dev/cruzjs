import { AppEvent } from '@cruzjs/core/shared/events/event';

export class MemberRoleChangedEvent extends AppEvent {
  constructor(
    public readonly orgId: string,
    public readonly userId: string,
    public readonly oldRole: string,
    public readonly newRole: string,
    public readonly changedBy: string
  ) {
    super();
  }
}

