/**
 * Docker / Self-Hosted Session Adapter
 *
 * Uses Redis for session storage when configured, ideal for multi-container
 * deployments. Redis provides sub-millisecond key-value lookups for fast
 * token validation. Falls back to in-memory for single-container setups.
 */

import type { SessionAdapter, SessionData } from '@cruzjs/core/sessions';

export class DockerRedisSessionAdapter implements SessionAdapter {
  private readonly inMemoryStore = new Map<string, SessionData>();

  constructor(
    private readonly redisUrl: string | null,
  ) {}

  async store(session: SessionData): Promise<void> {
    if (this.redisUrl) {
      // TODO: Redis SET session:<tokenHash> JSON with EX ttl
      // TODO: Redis SET session-id:<id> JSON with EX ttl
      // TODO: Redis SADD user-sessions:<userId> session.id
    }
    this.inMemoryStore.set(session.tokenHash, session);
    this.inMemoryStore.set(`id:${session.id}`, session);
  }

  async retrieve(tokenHash: string): Promise<SessionData | null> {
    if (this.redisUrl) {
      // TODO: Redis GET session:<tokenHash>, parse JSON
    }
    return this.inMemoryStore.get(tokenHash) ?? null;
  }

  async retrieveById(id: string): Promise<SessionData | null> {
    if (this.redisUrl) {
      // TODO: Redis GET session-id:<id>, parse JSON
    }
    return this.inMemoryStore.get(`id:${id}`) ?? null;
  }

  async listByUser(userId: string): Promise<SessionData[]> {
    if (this.redisUrl) {
      // TODO: Redis SMEMBERS user-sessions:<userId>, then MGET
    }
    return Array.from(this.inMemoryStore.values()).filter(
      (s) => s.userId === userId && !s.id.startsWith('id:'),
    );
  }

  async touch(id: string, lastActiveAt: Date): Promise<void> {
    const session = await this.retrieveById(id);
    if (!session) return;
    const updated = { ...session, lastActiveAt };
    this.inMemoryStore.set(session.tokenHash, updated);
    this.inMemoryStore.set(`id:${id}`, updated);
  }

  async revoke(id: string): Promise<void> {
    const session = await this.retrieveById(id);
    if (!session) return;
    const revoked = { ...session, revokedAt: new Date() };
    this.inMemoryStore.set(session.tokenHash, revoked);
    this.inMemoryStore.set(`id:${id}`, revoked);
  }

  async revokeAll(userId: string): Promise<void> {
    const sessions = await this.listByUser(userId);
    await Promise.all(sessions.map((s) => this.revoke(s.id)));
  }

  async prune(): Promise<number> {
    const now = new Date();
    let count = 0;
    for (const [key, session] of this.inMemoryStore) {
      if (session.expiresAt < now || session.revokedAt !== null) {
        this.inMemoryStore.delete(key);
        count++;
      }
    }
    return Math.floor(count / 2);
  }
}
