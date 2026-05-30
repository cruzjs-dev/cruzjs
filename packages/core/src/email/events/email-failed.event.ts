import { AppEvent } from '../../shared/events/event';

export class EmailFailedEvent extends AppEvent {
  constructor(
    public readonly to: string,
    public readonly subject: string,
    public readonly error: string,
    public readonly template?: string,
    public readonly attempt: number = 1
  ) {
    super();
  }
}

