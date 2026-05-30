/**
 * Cloudflare KV Session Adapter
 *
 * Uses KV for fast session lookups (by token hash) with D1 for persistence.
 * KV provides sub-millisecond reads at the edge, making token validation
 * extremely fast. Falls back to in-memory storage when KV is not available.
 */

import type { SessionAdapter, SessionData } from '@cruzjs/core/sessions';

const SESSION_PREFIX = 'session:';
const SESSION_USER_PREFIX = 'session-user:';

export class CloudflareKVSessionAdapter implements SessionAdapter {
  private readonly kv: KVNamespace | null;
  private readonly inMemoryStore = new Map<string, SessionData>();

  constructor(kvNamespace: KVNamespace | null) {
    this.kv = kvNamespace;
  }

  async store(session: SessionData): Promise<void> {
    const serialized = JSON.stringify(session, dateReplacer);
    const ttlSeconds = Math.max(
      1,
      Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
    );

    if (this.kv) {
      // Store by token hash for fast validation lookups
      await this.kv.put(`${SESSION_PREFIX}${session.tokenHash}`, serialized, {
        expirationTtl: ttlSeconds,
      });

      // Store by ID for management lookups
      await this.kv.put(`${SESSION_PREFIX}id:${session.id}`, serialized, {
        expirationTtl: ttlSeconds,
      });

      // Maintain user session list
      const userKey = `${SESSION_USER_PREFIX}${session.userId}`;
      const existing = await this.kv.get<string[]>(userKey, 'json') ?? [];
      if (!existing.includes(session.id)) {
        existing.push(session.id);
      }
      await this.kv.put(userKey, JSON.stringify(existing), {
        expirationTtl: 30 * 24 * 3600, // 30 days
      });
    } else {
      this.inMemoryStore.set(session.tokenHash, session);
      this.inMemoryStore.set(`id:${session.id}`, session);
    }
  }

  async retrieve(tokenHash: string): Promise<SessionData | null> {
    if (this.kv) {
      const raw = await this.kv.get(`${SESSION_PREFIX}${tokenHash}`, 'text');
      return raw ? JSON.parse(raw, dateReviver) as SessionData : null;
    }
    return this.inMemoryStore.get(tokenHash) ?? null;
  }

  async retrieveById(id: string): Promise<SessionData | null> {
    if (this.kv) {
      const raw = await this.kv.get(`${SESSION_PREFIX}id:${id}`, 'text');
      return raw ? JSON.parse(raw, dateReviver) as SessionData : null;
    }
    return this.inMemoryStore.get(`id:${id}`) ?? null;
  }

  async listByUser(userId: string): Promise<SessionData[]> {
    if (this.kv) {
      const userKey = `${SESSION_USER_PREFIX}${userId}`;
      const sessionIds = await this.kv.get<string[]>(userKey, 'json') ?? [];

      const sessions = await Promise.all(
        sessionIds.map((id) => this.retrieveById(id)),
      );
      return sessions.filter((s): s is SessionData => s !== null);
    }

    return Array.from(this.inMemoryStore.values()).filter(
      (s) => s.userId === userId && !s.tokenHash.startsWith('id:'),
    );
  }

  async touch(id: string, lastActiveAt: Date): Promise<void> {
    const session = await this.retrieveById(id);
    if (!session) return;

    const updated = { ...session, lastActiveAt };
    // Re-store with the updated lastActiveAt
    await this.store(updated);
  }

  async revoke(id: string): Promise<void> {
    const session = await this.retrieveById(id);
    if (!session) return;

    const revoked = { ...session, revokedAt: new Date() };

    if (this.kv) {
      // Update both keys
      const serialized = JSON.stringify(revoked, dateReplacer);
      await this.kv.put(`${SESSION_PREFIX}${session.tokenHash}`, serialized, { expirationTtl: 60 });
      await this.kv.put(`${SESSION_PREFIX}id:${id}`, serialized, { expirationTtl: 60 });
    } else {
      this.inMemoryStore.set(session.tokenHash, revoked);
      this.inMemoryStore.set(`id:${id}`, revoked);
    }
  }

  async revokeAll(userId: string): Promise<void> {
    const sessions = await this.listByUser(userId);
    await Promise.all(sessions.map((s) => this.revoke(s.id)));
  }

  async prune(): Promise<number> {
    // KV entries auto-expire via expirationTtl, so pruning is mostly a no-op.
    // For in-memory fallback, clean up expired entries.
    if (this.kv) return 0;

    const now = new Date();
    let count = 0;
    for (const [key, session] of this.inMemoryStore) {
      if (session.expiresAt < now || session.revokedAt !== null) {
        this.inMemoryStore.delete(key);
        count++;
      }
    }
    // Divide by 2 because each session is stored under two keys
    return Math.floor(count / 2);
  }
}

// ── JSON Date serialization helpers ───────────────────────────────────────

function dateReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Date) {
    return { __date: value.toISOString() };
  }
  return value;
}

function dateReviver(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && '__date' in (value as Record<string, unknown>)) {
    return new Date((value as { __date: string }).__date);
  }
  return value;
}
