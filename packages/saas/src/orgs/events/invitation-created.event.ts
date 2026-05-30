import { AppEvent } from '@cruzjs/core/shared/events/event';

export class InvitationCreatedEvent extends AppEvent {
  constructor(
    public readonly invitationId: string,
    public readonly orgId: string,
    public readonly email: string,
    public readonly role: string,
    public readonly invitedBy: string
  ) {
    super();
  }
}

