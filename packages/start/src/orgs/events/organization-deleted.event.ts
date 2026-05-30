import { AppEvent } from '@cruzjs/core/shared/events/event';

export class OrganizationDeletedEvent extends AppEvent {
  constructor(
    public readonly orgId: string,
    public readonly deletedBy: string
  ) {
    super();
  }
}
