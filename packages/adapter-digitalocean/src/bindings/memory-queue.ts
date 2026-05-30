import type { QueueBinding, LocalQueueLike } from '@cruzjs/core/runtime';

export class MemoryQueueBinding<T = unknown> implements QueueBinding<T>, LocalQueueLike<T> {
  private consumer: ((message: T) => Promise<void>) | null = null;
  constructor(private readonly queueName: string) {}
  onMessage(callback: (message: T) => Promise<void>): void { this.consumer = callback; }
  async send(message: T): Promise<void> {
    if (!this.consumer) { console.warn(`[MemoryQueue:${this.queueName}] No consumer, dropped`); return; }
    try { await this.consumer(message); } catch (e) { console.error(`[MemoryQueue:${this.queueName}] Error:`, e); }
  }
  async sendBatch(messages: { body: T }[]): Promise<void> { for (const m of messages) await this.send(m.body); }
}
