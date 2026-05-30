/**
 * Base event class
 * All events should extend this class
 */
export abstract class AppEvent {
  public readonly timestamp: Date;
  public readonly eventId: string;

  constructor() {
    this.timestamp = new Date();
    this.eventId = crypto.randomUUID();
  }
}

