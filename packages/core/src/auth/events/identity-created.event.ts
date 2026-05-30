import { AppEvent } from '../../shared/events/event';

export type IdentityCreatedPayload = {
  identityId: string;
  email: string;
  initialName?: string; // Optional, passed from registration form
};

/**
 * Event emitted when a new identity is created
 *
 * Apps should listen to this event to create the corresponding UserProfile
 */
export class IdentityCreatedEvent extends AppEvent {
  public readonly identityId: string;
  public readonly email: string;
  public readonly initialName?: string;

  constructor(payload: IdentityCreatedPayload) {
    super();
    this.identityId = payload.identityId;
    this.email = payload.email;
    this.initialName = payload.initialName;
  }
}
