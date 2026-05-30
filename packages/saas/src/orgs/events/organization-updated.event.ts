import { AppEvent } from '@cruzjs/core/shared/events/event';

export class OrganizationUpdatedEvent extends AppEvent {
  constructor(
    public readonly orgId: string,
    public readonly updatedBy: string,
    public readonly name?: string,
    public readonly slug?: string
  ) {
    super();
  }
}

