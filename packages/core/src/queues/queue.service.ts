import { Injectable } from '../di';

/**
 * Cloudflare Queue binding interface.
 * Also satisfied by LocalQueue for local development.
 */
export interface Queue<T = unknown> {
  send(message: T): Promise<void>;
  sendBatch(messages: { body: T }[]): Promise<void>;
}

/**
 * Generic queue dispatch service for Cloudflare Queues.
 *
 * Works with both real CF Queue bindings and LocalQueue facades.
 *
 * @example
 * ```ts
 * const queueService = container.get(QueueService);
 * const queue = CloudflareContext.getQueue<MyMessage>('MY_QUEUE');
 * await queueService.send(queue, { type: 'user.created', userId: '123' });
 * ```
 */
@Injectable()
export class QueueService {
  /**
   * Send a single message to a queue.
   */
  async send<T>(queue: { send(message: T): Promise<void> }, message: T): Promise<void> {
    try {
      await queue.send(message);
    } catch (error) {
      console.error('[QueueService] Failed to dispatch message:', error);
      throw error;
    }
  }

  /**
   * Send a batch of messages to a queue.
   */
  async sendBatch<T>(queue: { sendBatch(messages: { body: T }[]): Promise<void> }, messages: T[]): Promise<void> {
    try {
      await queue.sendBatch(messages.map((body) => ({ body })));
    } catch (error) {
      console.error('[QueueService] Failed to dispatch batch:', error);
      throw error;
    }
  }
}
