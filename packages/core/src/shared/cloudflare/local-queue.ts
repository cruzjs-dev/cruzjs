/**
 * In-memory Queue facade for local development.
 *
 * Provides the same runtime interface as Cloudflare Queues so that
 * QueueService works transparently when running without wrangler.
 *
 * Messages are dispatched to the registered consumer inline.
 * Errors are caught and logged (matching CF Queue at-least-once semantics).
 */

export type QueueConsumerCallback<T = unknown> = (message: T) => Promise<void>;

export class LocalQueue<T = unknown> {
  private consumer: QueueConsumerCallback<T> | null = null;

  constructor(private readonly name: string) {}

  /**
   * Register a consumer that will process messages sent to this queue.
   */
  onMessage(callback: QueueConsumerCallback<T>): void {
    this.consumer = callback;
  }

  async send(message: T): Promise<void> {
    if (!this.consumer) {
      console.warn(`[LocalQueue:${this.name}] No consumer registered, message dropped`);
      return;
    }

    try {
      await this.consumer(message);
    } catch (error) {
      console.error(`[LocalQueue:${this.name}] Consumer error:`, error);
    }
  }

  async sendBatch(messages: { body: T }[]): Promise<void> {
    for (const msg of messages) {
      await this.send(msg.body);
    }
  }
}
