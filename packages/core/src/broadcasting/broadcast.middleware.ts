/**
 * Broadcast Channel Authorization
 *
 * Provides pattern-based authorization for private and presence channels.
 * Register handlers with glob-style patterns to control channel access.
 *
 * @example
 * ```typescript
 * const authService = container.resolve(BroadcastAuthService);
 *
 * // Exact channel match
 * authService.authorizeChannel('admin-updates', async (channel, userId) => {
 *   return isAdmin(userId);
 * });
 *
 * // Wildcard match
 * authService.authorizeChannel('org.*.orders', async (channel, userId) => {
 *   const orgId = channel.split('.')[1];
 *   return isMemberOfOrg(userId, orgId);
 * });
 * ```
 */

import { Injectable } from '../di';

export type ChannelAuthHandler = (
  channel: string,
  userId: string,
  request: Request,
) => Promise<boolean>;

@Injectable()
export class BroadcastAuthService {
  private handlers = new Map<string, ChannelAuthHandler>();

  /**
   * Register an authorization handler for a channel pattern.
   * Patterns support `*` as a wildcard (matches any segment).
   */
  authorizeChannel(pattern: string, handler: ChannelAuthHandler): void {
    this.handlers.set(pattern, handler);
  }

  /**
   * Check if a user is authorized to access a channel.
   * Returns false if no handler matches the channel name.
   */
  async authorize(channel: string, userId: string, request: Request): Promise<boolean> {
    // Check exact match first
    const exactHandler = this.handlers.get(channel);
    if (exactHandler) {
      return exactHandler(channel, userId, request);
    }

    // Check wildcard patterns
    for (const [pattern, handler] of this.handlers) {
      if (this.matchPattern(pattern, channel)) {
        return handler(channel, userId, request);
      }
    }

    // No handler registered — deny by default for safety
    return false;
  }

  /**
   * Match a channel name against a glob pattern.
   * Supports `*` as wildcard for a single segment (between dots).
   */
  private matchPattern(pattern: string, channel: string): boolean {
    // Convert glob pattern to regex
    const regexStr = '^' + pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // Escape regex chars except *
      .replace(/\\\./g, '\\.')                  // Re-escape dots
      .replace(/\*/g, '[^.]+')                  // * matches one segment
    + '$';

    try {
      const regex = new RegExp(regexStr);
      return regex.test(channel);
    } catch {
      return false;
    }
  }
}
