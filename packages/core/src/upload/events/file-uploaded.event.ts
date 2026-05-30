import { AppEvent } from '../../shared/events/event';

export class FileUploadedEvent extends AppEvent {
  constructor(
    public readonly uploadId: string,
    public readonly userId: string,
    public readonly fileName: string,
    public readonly fileSize: number,
    public readonly contentType: string,
    public readonly key: string
  ) {
    super();
  }
}

