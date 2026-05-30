import { AppEvent } from '@cruzjs/core/shared/events/event';

export class InvitationAcceptedEvent extends AppEvent {
  constructor(
    public readonly invitationId: string,
    public readonly orgId: string,
    public readonly userId: string,
    public readonly email: string
  ) {
    super();
  }
}
