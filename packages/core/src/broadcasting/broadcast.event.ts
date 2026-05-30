/**
 * Broadcast Event Base Class
 *
 * Extend this to define custom broadcastable events.
 * Each event specifies which channels it should be broadcast on.
 *
 * @example
 * ```typescript
 * class OrderCreated extends BroadcastEvent {
 *   constructor(private order: Order) { super(); }
 *
 *   broadcastOn() {
 *     return [privateChannel(`org.${this.order.orgId}.orders`)];
 *   }
 *
 *   broadcastWith() {
 *     return { orderId: this.order.id, total: this.order.total };
 *   }
 * }
 * ```
 */

import type { BroadcastChannel } from './broadcast.channel';

export abstract class BroadcastEvent {
  /** The channels this event should be broadcast on */
  abstract broadcastOn(): BroadcastChannel[];

  /** The event name (defaults to class name) */
  broadcastAs(): string {
    return this.constructor.name;
  }

  /** The data payload to broadcast */
  broadcastWith(): Record<string, unknown> {
    return {};
  }
}
