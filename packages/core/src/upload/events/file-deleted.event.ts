import { AppEvent } from '../../shared/events/event';

export class FileDeletedEvent extends AppEvent {
  constructor(
    public readonly uploadId: string,
    public readonly userId: string,
    public readonly fileName: string,
    public readonly key: string
  ) {
    super();
  }
}

