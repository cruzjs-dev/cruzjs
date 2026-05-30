/**
 * Cloudflare Queue Binding
 */

import type { QueueBinding, LocalQueueLike } from '@cruzjs/core/runtime';

/**
 * Wraps a real Cloudflare Queue binding
 */
export class CloudflareQueueBinding<T = unknown> implements QueueBinding<T> {
  constructor(
    private cfQueue: {
      send(message: T): Promise<void>;
      sendBatch(messages: { body: T }[]): Promise<void>;
    },
  ) {}

  async send(message: T): Promise<void> {
    await this.cfQueue.send(message);
  }

  async sendBatch(messages: { body: T }[]): Promise<void> {
    await this.cfQueue.sendBatch(messages);
  }
}

/**
 * In-memory queue facade for local development
 */
export class CloudflareLocalQueue<T = unknown>
  implements QueueBinding<T>, LocalQueueLike<T>
{
  private consumer: ((message: T) => Promise<void>) | null = null;

  constructor(private readonly queueName: string) {}

  onMessage(callback: (message: T) => Promise<void>): void {
    this.consumer = callback;
  }

  async send(message: T): Promise<void> {
    if (!this.consumer) {
      console.warn(
        `[LocalQueue:${this.queueName}] No consumer registered, message dropped`,
      );
      return;
    }
    try {
      await this.consumer(message);
    } catch (error) {
      console.error(
        `[LocalQueue:${this.queueName}] Consumer error:`,
        error,
      );
    }
  }

  async sendBatch(messages: { body: T }[]): Promise<void> {
    for (const msg of messages) {
      await this.send(msg.body);
    }
  }
}
