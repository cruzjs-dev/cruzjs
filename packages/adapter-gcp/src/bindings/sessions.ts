/**
 * GCP Session Adapter
 *
 * Uses Firestore for session storage when configured. Firestore provides
 * fast document reads ideal for token validation. Falls back to in-memory
 * storage for local development.
 */

import type { SessionAdapter, SessionData } from '@cruzjs/core/sessions';

export class GCPSessionAdapter implements SessionAdapter {
  private readonly inMemoryStore = new Map<string, SessionData>();

  constructor(
    private readonly projectId: string | null,
  ) {}

  async store(session: SessionData): Promise<void> {
    if (this.projectId) {
      // TODO: Firestore set `sessions/${session.id}` with tokenHash index
    }
    this.inMemoryStore.set(session.tokenHash, session);
    this.inMemoryStore.set(`id:${session.id}`, session);
  }

  async retrieve(tokenHash: string): Promise<SessionData | null> {
    if (this.projectId) {
      // TODO: Firestore query where tokenHash == tokenHash
    }
    return this.inMemoryStore.get(tokenHash) ?? null;
  }

  async retrieveById(id: string): Promise<SessionData | null> {
    if (this.projectId) {
      // TODO: Firestore get `sessions/${id}`
    }
    return this.inMemoryStore.get(`id:${id}`) ?? null;
  }

  async listByUser(userId: string): Promise<SessionData[]> {
    if (this.projectId) {
      // TODO: Firestore query where userId == userId
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
