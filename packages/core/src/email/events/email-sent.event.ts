import { AppEvent } from '../../shared/events/event';

export class EmailSentEvent extends AppEvent {
  constructor(
    public readonly to: string,
    public readonly subject: string,
    public readonly messageId: string,
    public readonly template?: string,
    public readonly success: boolean = true
  ) {
    super();
  }
}

