import { AppEvent } from '@cruzjs/core/shared/events/event';

export class InvitationCancelledEvent extends AppEvent {
  constructor(
    public readonly invitationId: string,
    public readonly orgId: string,
    public readonly email: string,
    public readonly cancelledBy: string
  ) {
    super();
  }
}

