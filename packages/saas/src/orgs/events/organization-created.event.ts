import { AppEvent } from '@cruzjs/core/shared/events/event';

export class OrganizationCreatedEvent extends AppEvent {
  constructor(
    public readonly orgId: string,
    public readonly name: string,
    public readonly slug: string,
    public readonly ownerId: string
  ) {
    super();
  }
}

